import 'dotenv/config'
import { getDefaultAccount, accountFromPrivateKey, listTransactions } from './lib/pt-client.js'

async function main() {
  const useBob = (process.env.PT_LIST_ACCOUNT ?? '').toLowerCase() === 'bob'
  const signer =
    useBob && process.env.BOB_PRIVATE_KEY ? accountFromPrivateKey(process.env.BOB_PRIVATE_KEY) : getDefaultAccount()
  const data = await listTransactions(signer.address, 10, '', signer)
  console.log('Transactions:', JSON.stringify(data, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
