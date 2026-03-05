import 'dotenv/config'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(THIS_DIR, '..')
const SCRIPTS = `${ROOT}/scripts`
const BUN = process.env.BUN_BIN ?? 'bun'

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

function run(cmd: string, cwd = SCRIPTS): string {
  return execSync(cmd, {
    cwd,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    env: process.env,
  })
}

function pickRpc(): string {
  try {
    const rpc = run('./scripts/lib/select-sepolia-rpc.sh', ROOT).trim()
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
  console.log(run(`${BUN} run pt-check-balance.ts`))

  console.log('2) Generate Bob shielded address')
  const shieldOut = run(`${BUN} run pt-shielded-address.ts`)
  console.log(shieldOut)
  const shielded = parseFirstAddress(shieldOut)

  console.log('3) Private transfer to shielded address')
  const transferOut = run(
    `PT_RECIPIENT=${shielded} PT_TRANSFER_AMOUNT=1000000000000000000 ${BUN} run pt-private-transfer.ts`
  )
  console.log(transferOut)

  console.log('4) Verify invisible transfer in Bob private tx list')
  console.log(run(`PT_LIST_ACCOUNT=bob ${BUN} run pt-list-transactions.ts`))

  console.log('5) Request withdraw ticket for Bob')
  const withdrawOut = run(`PT_WITHDRAW_AMOUNT=1000000000000000000 ${BUN} run pt-withdraw.ts`)
  console.log(withdrawOut)
  const ticketObj = parseJsonAfterLabel(withdrawOut, 'WithdrawTicket:')

  console.log('6) Redeem ticket on-chain with Bob key')
  const rpc = pickRpc()
  const ticket = ticketObj.ticket as string
  const amount = ticketObj.amount as string
  const token = requireEnv('GHOST_TOKEN_ADDRESS')

  const withdrawCmd = [
    'cast send 0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13',
    '"withdrawWithTicket(address,uint256,bytes)"',
    token,
    amount,
    ticket,
    `--rpc-url ${rpc}`,
    `--private-key ${requireEnv('BOB_PRIVATE_KEY')}`,
  ].join(' ')

  const receiptOut = run(withdrawCmd, ROOT)
  console.log(receiptOut)

  console.log('Privacy flow complete')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
