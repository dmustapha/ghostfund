import 'dotenv/config'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(THIS_DIR, '..')
const WORKFLOW = `${ROOT}/workflow`
const CRE_BIN = process.env.CRE_BIN ?? 'cre'
const BUN_BIN = process.env.BUN_BIN ?? 'bun'
const AAVE_FAUCET = process.env.AAVE_FAUCET ?? '0xC959483DBa39aa9E78757139af0e9a2EDEb3f42D'

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

function normalizePrivateKey(raw: string): string {
  return raw.startsWith('0x') ? raw : `0x${raw}`
}

function run(cmd: string, cwd = ROOT, extraEnv: Record<string, string> = {}): string {
  return execSync(cmd, {
    cwd,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ...extraEnv },
  })
}

function pickRpc(): string {
  try {
    const rpc = run('./scripts/lib/select-sepolia-rpc.sh').trim()
    if (rpc) return rpc
  } catch {
    // fallback below
  }
  return requireEnv('SEPOLIA_RPC_URL')
}

function parseCastUint(raw: string): bigint {
  const token = raw.trim().split(/\s+/)[0]
  return BigInt(token)
}

const vaultAbi = [
  {
    type: 'function',
    name: 'recommendationCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'recommendations',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'action', type: 'uint8' },
      { name: 'apy', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'executed', type: 'bool' },
    ],
  },
  {
    type: 'function',
    name: 'getAavePosition',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [
      { name: 'apy', type: 'uint256' },
      { name: 'balance', type: 'uint256' },
    ],
  },
] as const

async function main() {
  const vault = requireEnv('GHOSTFUND_VAULT_ADDRESS') as `0x${string}`
  const strategyAsset = (process.env.AAVE_TEST_TOKEN ?? process.env.GHOST_TOKEN_ADDRESS) as string
  if (!strategyAsset) {
    throw new Error('Missing AAVE_TEST_TOKEN (or fallback GHOST_TOKEN_ADDRESS)')
  }
  const rpc = pickRpc()
  const pk = normalizePrivateKey(requireEnv('PRIVATE_KEY'))
  const deployer = run(`cast wallet address --private-key ${pk}`).trim()
  const topupAmount = 1000000000000000000n
  const preCount = parseCastUint(
    run(
      `cast call ${vault} "recommendationCount()(uint256)" --rpc-url ${rpc}`
    )
  )

  console.log('1) Ensure deployer has strategy-asset balance')
  let deployerBal = parseCastUint(
    run(`cast call ${strategyAsset} "balanceOf(address)(uint256)" ${deployer} --rpc-url ${rpc}`)
  )
  if (deployerBal < topupAmount) {
    console.log('Deployer balance low; attempting Aave faucet mint...')
    run(
      `cast send ${AAVE_FAUCET} "mint(address,address,uint256)" ${strategyAsset} ${deployer} ${topupAmount.toString()} --rpc-url ${rpc} --private-key ${pk}`
    )
    deployerBal = parseCastUint(
      run(`cast call ${strategyAsset} "balanceOf(address)(uint256)" ${deployer} --rpc-url ${rpc}`)
    )
  }
  if (deployerBal < topupAmount) {
    throw new Error(
      `Insufficient strategy-asset balance after faucet attempt. asset=${strategyAsset}, balance=${deployerBal.toString()}`
    )
  }

  console.log('2) Ensure vault has strategy-asset idle balance')
  console.log(
    run(
      `cast send ${strategyAsset} "transfer(address,uint256)" ${vault} ${topupAmount.toString()} --rpc-url ${rpc} --private-key ${pk}`
    )
  )

  console.log('3) Trigger CRE workflow broadcast simulation (writes recommendation)')
  const creCmd =
    `PATH="${path.dirname(BUN_BIN)}:$PATH" ${CRE_BIN} workflow simulate ./workflow --target staging-settings --non-interactive --trigger-index 0 --broadcast`
  console.log(run(creCmd, WORKFLOW, { CRE_ETH_PRIVATE_KEY: pk }))

  const client = createPublicClient({ chain: sepolia, transport: http(rpc) })

  console.log('4) Fetch latest recommendation and approve')
  const count = (await client.readContract({
    address: vault,
    abi: vaultAbi,
    functionName: 'recommendationCount',
  })) as bigint

  if (count === 0n) {
    throw new Error('No recommendations exist on vault')
  }
  if (count <= preCount) {
    console.log(
      `No new recommendation created this run (pre=${preCount.toString()}, post=${count.toString()}); searching for pending rec`
    )
  }

  let chosenId: bigint | null = null
  for (let i = count - 1n; i >= 0n; i--) {
    const rec = (await client.readContract({
      address: vault,
      abi: vaultAbi,
      functionName: 'recommendations',
      args: [i],
    })) as readonly [`0x${string}`, bigint, number, bigint, bigint, boolean]
    if (!rec[5]) {
      chosenId = i
      break
    }
    if (i === 0n) break
  }

  if (chosenId === null) {
    throw new Error('No pending recommendation available for userApprove')
  }

  console.log(run(`cast send ${vault} "userApprove(uint256)" ${chosenId} --rpc-url ${rpc} --private-key ${pk}`))

  console.log('5) Verify Aave position')
  const asset = strategyAsset as `0x${string}`
  const position = (await client.readContract({
    address: vault,
    abi: vaultAbi,
    functionName: 'getAavePosition',
    args: [asset],
  })) as readonly [bigint, bigint]

  console.log(
    JSON.stringify(
      {
        asset,
        apyRay: position[0].toString(),
        aTokenBalance: position[1].toString(),
      },
      null,
      2
    )
  )

  console.log('Yield flow complete')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
