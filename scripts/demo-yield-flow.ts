import 'dotenv/config'
import { execSync } from 'node:child_process'
import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'

const ROOT = '/Users/MAC/hackathon-toolkit/active/ghostfund-v2'
const WORKFLOW = `${ROOT}/workflow`

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
  const ghost = requireEnv('GHOST_TOKEN_ADDRESS')
  const rpc = pickRpc()
  const pk = normalizePrivateKey(requireEnv('PRIVATE_KEY'))

  console.log('1) Ensure vault has demo funds')
  console.log(
    run(`cast send ${ghost} "transfer(address,uint256)" ${vault} 1000000000000000000 --rpc-url ${rpc} --private-key ${pk}`)
  )

  console.log('2) Trigger CRE workflow broadcast simulation (writes recommendation)')
  const creCmd =
    'PATH="/Users/MAC/.bun/bin:$PATH" /Users/MAC/.cre/bin/cre workflow simulate ./workflow --target staging-settings --non-interactive --trigger-index 0 --broadcast'
  console.log(run(creCmd, WORKFLOW, { CRE_ETH_PRIVATE_KEY: pk }))

  const client = createPublicClient({ chain: sepolia, transport: http(rpc) })

  console.log('3) Fetch latest recommendation and approve if pending')
  const count = (await client.readContract({
    address: vault,
    abi: vaultAbi,
    functionName: 'recommendationCount',
  })) as bigint

  if (count === 0n) {
    throw new Error('No recommendations found after CRE broadcast')
  }

  const latestId = count - 1n
  const rec = (await client.readContract({
    address: vault,
    abi: vaultAbi,
    functionName: 'recommendations',
    args: [latestId],
  })) as readonly [`0x${string}`, bigint, number, bigint, bigint, boolean]

  if (rec[5]) {
    console.log(`Latest recommendation ${latestId} already executed; skipping userApprove`)
  } else {
    console.log(run(`cast send ${vault} "userApprove(uint256)" ${latestId} --rpc-url ${rpc} --private-key ${pk}`))
  }

  console.log('4) Verify Aave position')
  const asset = (process.env.AAVE_TEST_TOKEN || ghost) as `0x${string}`
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
