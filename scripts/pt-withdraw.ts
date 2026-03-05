import 'dotenv/config'
import { accountFromPrivateKey, getWithdrawTicket } from './lib/pt-client.js'

function signerFromEnv(pkEnv: string) {
  const raw = process.env[pkEnv]
  if (!raw) {
    throw new Error(`Missing ${pkEnv}`)
  }
  return accountFromPrivateKey(raw)
}

async function main() {
  const token = process.env.GHOST_TOKEN_ADDRESS as string
  const amount = process.env.PT_WITHDRAW_AMOUNT ?? '50000000000000000000000' // 50k

  if (!token) {
    throw new Error('Missing GHOST_TOKEN_ADDRESS')
  }

  // Withdraw ticket for Bob (recipient side)
  const bob = signerFromEnv('BOB_PRIVATE_KEY')
  const data = await getWithdrawTicket(bob.address, token, amount, bob)
  console.log('WithdrawTicket:', JSON.stringify(data, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
