import 'dotenv/config'
import { checkBalance, getDefaultAccount } from './lib/pt-client.js'

async function main() {
  const data = await checkBalance(getDefaultAccount().address)
  console.log('Status: 200')
  console.log('Balances:', JSON.stringify(data, null, 2))
}

main().catch(console.error)
