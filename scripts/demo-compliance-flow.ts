import 'dotenv/config'
import { execSync } from 'node:child_process'
import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'

const ROOT = '/Users/MAC/hackathon-toolkit/active/ghostfund-v2'

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

function run(cmd: string, cwd = ROOT): string {
  return execSync(cmd, {
    cwd,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    env: process.env,
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

async function main() {
  const rpc = pickRpc()
  const client = createPublicClient({ chain: sepolia, transport: http(rpc) })

  const allow = requireEnv('ALLOW_POLICY_ADDRESS') as `0x${string}`
  const alice = requireEnv('ALICE_ADDRESS') as `0x${string}`
  const blocked = '0x0000000000000000000000000000000000000001' as `0x${string}`

  console.log('1) Allowed address check (should be true)')
  const allowed = await readAllowed(client, allow, alice)
  console.log(JSON.stringify({ alice, allowed }, null, 2))

  console.log('2) Blocked address check (should be false)')
  const blockedAllowed = await readAllowed(client, allow, blocked)
  console.log(JSON.stringify({ blocked, allowed: blockedAllowed }, null, 2))

  console.log('3) Over-limit and pause/unpause demo hooks')
  const maxPolicy = process.env.MAX_POLICY_ADDRESS
  const pausePolicy = process.env.PAUSE_POLICY_ADDRESS

  if (!maxPolicy) {
    console.log('MAX_POLICY_ADDRESS not set; skipping over-limit live step.')
  } else {
    console.log(`MAX_POLICY_ADDRESS=${maxPolicy} configured; run policy-specific over-limit tx in demo runbook.`)
  }

  if (!pausePolicy) {
    console.log('PAUSE_POLICY_ADDRESS not set; skipping pause/unpause live step.')
  } else {
    console.log(run(`cast send ${pausePolicy} "pause()" --rpc-url ${rpc} --private-key ${requireEnv('PRIVATE_KEY')}`))
    console.log(run(`cast send ${pausePolicy} "unpause()" --rpc-url ${rpc} --private-key ${requireEnv('PRIVATE_KEY')}`))
  }

  console.log('Compliance flow complete')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
