import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPublicClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { runCommand } from './lib/shell.js'

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(THIS_DIR, '..')
const PT_VAULT = '0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13' as `0x${string}`

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

const allowAbiCandidates = [
  {
    type: 'function',
    name: 'isAllowed',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'addressAllowed',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

const ptVaultAbi = [
  {
    type: 'function',
    name: 'checkDepositAllowed',
    stateMutability: 'view',
    inputs: [
      { name: 'depositor', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const

async function readAllowed(client: ReturnType<typeof createPublicClient>, allow: `0x${string}`, user: `0x${string}`) {
  for (const fn of allowAbiCandidates) {
    try {
      return (await client.readContract({
        address: allow,
        abi: [fn],
        functionName: fn.name,
        args: [user],
      })) as boolean
    } catch {
      // try next function signature
    }
  }
  throw new Error('No compatible allowlist read function found (tried isAllowed/addressAllowed)')
}

async function expectDepositAllowed(
  client: ReturnType<typeof createPublicClient>,
  depositor: `0x${string}`,
  token: `0x${string}`,
  amount: bigint
) {
  await client.readContract({
    address: PT_VAULT,
    abi: ptVaultAbi,
    functionName: 'checkDepositAllowed',
    args: [depositor, token, amount],
  })
}

async function expectDepositBlocked(
  client: ReturnType<typeof createPublicClient>,
  depositor: `0x${string}`,
  token: `0x${string}`,
  amount: bigint,
  label: string
) {
  try {
    await expectDepositAllowed(client, depositor, token, amount)
    throw new Error(`${label} expected revert but succeeded`)
  } catch {
    console.log(`${label}: blocked as expected`)
  }
}

async function main() {
  const rpc = pickRpc()
  const client = createPublicClient({ chain: sepolia, transport: http(rpc) })

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

  console.log('3) Policy enforcement checks on PT vault')
  await expectDepositAllowed(client, alice, token, 1n)
  await expectDepositBlocked(client, blocked, token, 1n, 'blocked-address deposit')

  console.log('4) Over-limit and pause/unpause checks')
  const maxPolicy = process.env.MAX_POLICY_ADDRESS
  const pausePolicy = process.env.PAUSE_POLICY_ADDRESS

  if (!maxPolicy) {
    console.log('MAX_POLICY_ADDRESS not set; skipping over-limit check.')
  } else {
    await expectDepositBlocked(client, alice, token, 10n ** 30n, 'over-limit deposit')
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
    await expectDepositBlocked(client, deployer, token, 1n, 'paused deposit')
    console.log(
      run(
        'cast',
        ['send', pausePolicy, 'setPausedState(bool)', 'false', '--rpc-url', rpc, '--private-key', adminKey],
        ROOT,
        {},
        [adminKey]
      )
    )
    await expectDepositAllowed(client, deployer, token, 1n)
  }

  console.log('Compliance flow complete')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
