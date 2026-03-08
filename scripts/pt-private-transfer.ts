import 'dotenv/config'
import { getDefaultAccount, privateTransfer } from './lib/pt-client.js'

async function main() {
  const recipient = (process.env.PT_RECIPIENT ?? process.env.BOB_ADDRESS) as string
  const token = process.env.GHOST_TOKEN_ADDRESS as string
  const amount = process.env.PT_TRANSFER_AMOUNT ?? '50000000000000000000000' // 50k

  if (!recipient || !token) {
    throw new Error('Missing PT_RECIPIENT/BOB_ADDRESS or GHOST_TOKEN_ADDRESS')
  }

  const data = await privateTransfer(getDefaultAccount().address, recipient, token, amount, ['hide-sender'])
  console.log('PrivateTransfer:', JSON.stringify(data, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
