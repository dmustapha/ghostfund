import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPublicClient, http, formatEther } from 'viem'
import { sepolia } from 'viem/chains'
import { runCommand } from './lib/shell.js'
import { vaultAbi } from './lib/abis.js'
import { PT_API_BASE } from './lib/constants.js'
import {
  accountFromPrivateKey,
  checkBalance,
  generateShieldedAddress,
  privateTransfer,
  getWithdrawTicket,
} from './lib/pt-client.js'

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(THIS_DIR, '..')

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

function normalizePrivateKey(raw: string): string {
  return raw.startsWith('0x') ? raw : `0x${raw}`
}

function run(
  cmd: string,
  args: string[],
  cwd = ROOT,
  extraEnv: Record<string, string> = {},
  secretValues: string[] = []
): string {
  return runCommand({
    cmd,
    args,
    cwd,
    env: { ...process.env, ...extraEnv },
    secretValues,
  })
}

function pickRpc(): string {
  try {
    const rpc = run('./scripts/lib/select-sepolia-rpc.sh', []).trim()
    if (rpc) return rpc
  } catch {
    // fallback below
  }
  return requireEnv('SEPOLIA_RPC_URL')
}

function parseCastUint(raw: string): bigint {
  return BigInt(raw.trim().split(/\s+/)[0])
}

async function main() {
  const vault = requireEnv('GHOSTFUND_VAULT_ADDRESS') as `0x${string}`
  const token = requireEnv('GHOST_TOKEN_ADDRESS') as `0x${string}`
  const pk = normalizePrivateKey(requireEnv('PRIVATE_KEY'))
  const bobPk = normalizePrivateKey(requireEnv('BOB_PRIVATE_KEY'))
  const rpc = pickRpc()

  const client = createPublicClient({ chain: sepolia, transport: http(rpc) })
  const deployer = run('cast', ['wallet', 'address', '--private-key', pk], ROOT, {}, [pk]).trim()
  const bobSigner = accountFromPrivateKey(bobPk)

  // Check PT API availability
  try {
    const res = await fetch(`${PT_API_BASE}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    console.log('PT API: reachable')
  } catch {
    console.error('ERROR: PT API at convergence2026-token-api.cldev.cloud is unreachable.')
    process.exit(1)
  }

  console.log('1) Read vault Aave position (aToken balance = principal + yield)')
  const position = (await client.readContract({
    address: vault,
    abi: vaultAbi,
    functionName: 'getAavePosition',
    args: [token],
  })) as readonly [bigint, bigint]
  const aTokenBalance = position[1]
  console.log(`   aToken balance: ${formatEther(aTokenBalance)} (${aTokenBalance.toString()} wei)`)

  console.log('2) Read vault idle token balance')
  const idleBalance = parseCastUint(
    run('cast', ['call', token, 'balanceOf(address)(uint256)', vault, '--rpc-url', rpc])
  )
  console.log(`   Idle balance:   ${formatEther(idleBalance)} (${idleBalance.toString()} wei)`)

  // Determine the amount available for private distribution
  let withdrawAmount = aTokenBalance
  if (aTokenBalance > 0n) {
    console.log('3) Withdraw Aave position back to vault')
    run(
      'cast',
      [
        'send', vault, 'withdrawFromPool(address,uint256)', token, aTokenBalance.toString(),
        '--rpc-url', rpc, '--private-key', pk,
      ],
      ROOT, {}, [pk]
    )
    console.log(`   Withdrew ${formatEther(aTokenBalance)} from Aave`)
  } else {
    console.log('3) No Aave position — using idle balance for demo')
    withdrawAmount = idleBalance
  }

  if (withdrawAmount === 0n) {
    console.error('ERROR: Vault has no tokens to distribute. Run demo-yield-flow.ts first.')
    process.exit(1)
  }

  // Withdraw tokens from vault contract to deployer wallet for PT transfer
  console.log('3b) Withdraw tokens from vault to deployer wallet')
  run(
    'cast',
    [
      'send', vault, 'withdraw(address,uint256)', token, withdrawAmount.toString(),
      '--rpc-url', rpc, '--private-key', pk,
    ],
    ROOT, {}, [pk]
  )
  console.log(`   Withdrew ${formatEther(withdrawAmount)} from vault to deployer`)

  // Use a demo amount (1 token) or whatever is available, whichever is smaller
  const demoAmount = withdrawAmount < 1000000000000000000n ? withdrawAmount : 1000000000000000000n
  const demoAmountStr = demoAmount.toString()

  console.log('4) Generate Bob shielded address and transfer privately')
  const { address: shielded } = await generateShieldedAddress(bobSigner.address, bobSigner)
  console.log(`   Shielded address: ${shielded}`)

  const { transaction_id } = await privateTransfer(
    deployer,
    shielded,
    token,
    demoAmountStr,
    ['hide-sender']
  )
  console.log(`   Private transfer sent: tx=${transaction_id}, amount=${formatEther(demoAmount)}`)

  console.log('5) Check Bob private balance')
  const balances = await checkBalance(bobSigner.address, bobSigner)
  console.log(`   Bob balances: ${JSON.stringify(balances, null, 2)}`)

  console.log('6) Request withdraw ticket for Bob')
  const ticket = await getWithdrawTicket(bobSigner.address, token, demoAmountStr, bobSigner)
  console.log(`   WithdrawTicket: ${JSON.stringify(ticket, null, 2)}`)

  console.log(
    'Private yield flow complete — yield earned on Aave was privately distributed via PT'
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
