import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPublicClient, http, toFunctionSelector } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { runCommand } from './lib/shell.js'
import { PT_VAULT_ADDRESS } from './lib/constants.js'
import { allowAbiCandidates } from './lib/abis.js'

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(THIS_DIR, '..')
const PT_VAULT = PT_VAULT_ADDRESS as `0x${string}`

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
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

async function readAllowed(client: ReturnType<typeof createPublicClient>, allow: `0x${string}`, user: `0x${string}`) {
  for (const fn of allowAbiCandidates) {
    try {
      return (await client.readContract({
        address: allow,
        abi: [fn],
        functionName: fn.name,
        args: [user],
      })) as boolean
    } catch (e) {
      console.log(`  (${fn.name} not supported, trying next...)`)
    }
  }
  throw new Error('No compatible allowlist read function found (tried isAllowed/addressAllowed)')
}

// ACE PolicyEngine.check() takes a Payload struct: (bytes4 selector, address sender, bytes data, bytes context)
// The policy engine uses msg.sender as the target lookup key, so we must set `account` to PT_VAULT
// to simulate the call as if the vault is invoking the policy engine.
const policyEngineAbi = [
  {
    type: 'function' as const,
    name: 'check',
    stateMutability: 'view' as const,
    inputs: [
      {
        name: 'payload',
        type: 'tuple',
        components: [
          { name: 'selector', type: 'bytes4' },
          { name: 'sender', type: 'address' },
          { name: 'data', type: 'bytes' },
          { name: 'context', type: 'bytes' },
        ],
      },
    ],
    outputs: [],
  },
] as const

const DEPOSIT_SELECTOR = toFunctionSelector('checkDepositAllowed(address,address,uint256)')

async function checkPolicyEngine(
  client: ReturnType<typeof createPublicClient>,
  policyEngine: `0x${string}`,
  depositor: `0x${string}`,
  token: `0x${string}`,
  amount: bigint
) {
  const { encodeAbiParameters, parseAbiParameters } = await import('viem')
  const data = encodeAbiParameters(
    parseAbiParameters('address depositor, address token, uint256 amount'),
    [depositor, token, amount]
  )
  await client.readContract({
    address: policyEngine,
    abi: policyEngineAbi,
    functionName: 'check',
    args: [{ selector: DEPOSIT_SELECTOR, sender: depositor, data, context: '0x' }],
    account: PT_VAULT,
  })
}

async function expectDepositAllowed(
  client: ReturnType<typeof createPublicClient>,
  policyEngine: `0x${string}`,
  depositor: `0x${string}`,
  token: `0x${string}`,
  amount: bigint
) {
  await checkPolicyEngine(client, policyEngine, depositor, token, amount)
}

async function expectDepositBlocked(
  client: ReturnType<typeof createPublicClient>,
  policyEngine: `0x${string}`,
  depositor: `0x${string}`,
  token: `0x${string}`,
  amount: bigint,
  label: string
) {
  try {
    await checkPolicyEngine(client, policyEngine, depositor, token, amount)
    throw new Error(`${label} expected revert but succeeded`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('expected revert but succeeded')) throw err
    if (msg.includes('fetch') || msg.includes('ECONNREFUSED') || msg.includes('timeout')) {
      throw new Error(`${label}: network error (not a policy block): ${msg}`)
    }
    console.log(`${label}: blocked as expected`)
  }
}

async function main() {
  const rpc = pickRpc()
  const client = createPublicClient({ chain: sepolia, transport: http(rpc) })

  const pe = requireEnv('POLICY_ENGINE_ADDRESS') as `0x${string}`
  const allow = requireEnv('ALLOW_POLICY_ADDRESS') as `0x${string}`
  const alice = requireEnv('ALICE_ADDRESS') as `0x${string}`
  const token = requireEnv('GHOST_TOKEN_ADDRESS') as `0x${string}`
  const blocked = '0x0000000000000000000000000000000000000001' as `0x${string}`
  const deployerPk = requireEnv('PRIVATE_KEY')
  const deployer = privateKeyToAccount(
    (deployerPk.startsWith('0x') ? deployerPk : `0x${deployerPk}`) as `0x${string}`
  ).address

  console.log('1) Allowed address check (allowlist view)')
  const allowed = await readAllowed(client, allow, alice)
  console.log(JSON.stringify({ alice, allowed }, null, 2))

  console.log('2) Blocked address check (allowlist view)')
  const blockedAllowed = await readAllowed(client, allow, blocked)
  console.log(JSON.stringify({ blocked, allowed: blockedAllowed }, null, 2))

  console.log('3) Policy engine enforcement checks')
  await expectDepositAllowed(client, pe, alice, token, 1n)
  console.log('alice deposit: allowed as expected')
  await expectDepositBlocked(client, pe, blocked, token, 1n, 'blocked-address deposit')

  console.log('4) Over-limit and pause/unpause checks')
  const maxPolicy = process.env.MAX_POLICY_ADDRESS
  const pausePolicy = process.env.PAUSE_POLICY_ADDRESS

  if (!maxPolicy) {
    console.log('MAX_POLICY_ADDRESS not set; skipping over-limit check.')
  } else {
    await expectDepositBlocked(client, pe, alice, token, 10n ** 30n, 'over-limit deposit')
  }

  if (!pausePolicy) {
    console.log('PAUSE_POLICY_ADDRESS not set; skipping pause/unpause check.')
  } else {
    const adminKey = requireEnv('PRIVATE_KEY')
    console.log(
      run(
        'cast',
        ['send', pausePolicy, 'setPausedState(bool)', 'true', '--rpc-url', rpc, '--private-key', adminKey],
        ROOT,
        {},
        [adminKey]
      )
    )
    await expectDepositBlocked(client, pe, deployer, token, 1n, 'paused deposit')
    console.log(
      run(
        'cast',
        ['send', pausePolicy, 'setPausedState(bool)', 'false', '--rpc-url', rpc, '--private-key', adminKey],
        ROOT,
        {},
        [adminKey]
      )
    )
    await expectDepositAllowed(client, pe, deployer, token, 1n)
    console.log('unpaused deposit: allowed as expected')
  }

  console.log('Compliance flow complete')
}

main().catch((err) => {
  console.error('Compliance flow failed:', err instanceof Error ? err.message : err)
  console.error('Ensure ALLOW_POLICY_ADDRESS, ALICE_ADDRESS, and GHOST_TOKEN_ADDRESS are set in .env')
  process.exit(1)
})
