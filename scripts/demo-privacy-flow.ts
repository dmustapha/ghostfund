import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runCommand } from './lib/shell.js'

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(THIS_DIR, '..')
const SCRIPTS = `${ROOT}/scripts`
const BUN = process.env.BUN_BIN ?? 'bun'

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

function run(
  cmd: string,
  args: string[],
  cwd = SCRIPTS,
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
    const rpc = run('./scripts/lib/select-sepolia-rpc.sh', [], ROOT).trim()
    if (rpc) return rpc
  } catch {
    // fallback below
  }
  return requireEnv('SEPOLIA_RPC_URL')
}

function parseFirstAddress(text: string): string {
  const m = text.match(/0x[a-fA-F0-9]{40}/)
  if (!m) throw new Error('No address found in output')
  return m[0]
}

function parseJsonAfterLabel(text: string, label: string): any {
  const idx = text.indexOf(label)
  if (idx < 0) throw new Error(`Missing label ${label}`)
  const jsonStart = text.indexOf('{', idx)
  if (jsonStart < 0) throw new Error(`Missing JSON object after ${label}`)
  return JSON.parse(text.slice(jsonStart))
}

async function main() {
  requireEnv('GHOST_TOKEN_ADDRESS')
  requireEnv('BOB_PRIVATE_KEY')

  console.log('1) Check private balance')
  console.log(run(BUN, ['run', 'pt-check-balance.ts']))

  console.log('2) Generate Bob shielded address')
  const shieldOut = run(BUN, ['run', 'pt-shielded-address.ts'])
  console.log(shieldOut)
  const shielded = parseFirstAddress(shieldOut)

  console.log('3) Private transfer to shielded address')
  const transferOut = run(BUN, ['run', 'pt-private-transfer.ts'], SCRIPTS, {
    PT_RECIPIENT: shielded,
    PT_TRANSFER_AMOUNT: '1000000000000000000',
  })
  console.log(transferOut)

  console.log('4) Verify invisible transfer in Bob private tx list')
  console.log(run(BUN, ['run', 'pt-list-transactions.ts'], SCRIPTS, { PT_LIST_ACCOUNT: 'bob' }))

  console.log('5) Request withdraw ticket for Bob')
  const withdrawOut = run(BUN, ['run', 'pt-withdraw.ts'], SCRIPTS, { PT_WITHDRAW_AMOUNT: '1000000000000000000' })
  console.log(withdrawOut)
  const ticketObj = parseJsonAfterLabel(withdrawOut, 'WithdrawTicket:')

  console.log('6) Redeem ticket on-chain with Bob key')
  const rpc = pickRpc()
  const ticket = ticketObj.ticket as string
  const amount = ticketObj.amount as string
  const token = requireEnv('GHOST_TOKEN_ADDRESS')

  const bobKey = requireEnv('BOB_PRIVATE_KEY')
  const receiptOut = run(
    'cast',
    [
      'send',
      '0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13',
      'withdrawWithTicket(address,uint256,bytes)',
      token,
      amount,
      ticket,
      '--rpc-url',
      rpc,
      '--private-key',
      bobKey,
    ],
    ROOT,
    {},
    [bobKey]
  )
  console.log(receiptOut)

  console.log('Privacy flow complete')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
