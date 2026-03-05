import 'dotenv/config'
import { privateKeyToAccount } from 'viem/accounts'
import { PT_DOMAIN, PT_TYPES, PT_API_BASE } from './lib/constants.js'

const privateKey = (() => {
  const raw = process.env.PRIVATE_KEY ?? ''
  const normalized = raw.startsWith('0x') ? raw.slice(2) : raw
  return `0x${normalized}` as `0x${string}`
})()

const account = privateKeyToAccount(privateKey)

async function main() {
  const timestamp = BigInt(Math.floor(Date.now() / 1000))

  const signature = await account.signTypedData({
    domain: PT_DOMAIN,
    types: PT_TYPES,
    primaryType: 'Retrieve Balances',
    message: { account: account.address, timestamp },
  })

  const response = await fetch(`${PT_API_BASE}/balances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      account: account.address,
      timestamp: Number(timestamp),
      auth: signature,
    }),
  })

  const data = await response.json()
  console.log('Status:', response.status)
  console.log('Balances:', JSON.stringify(data, null, 2))
}

main().catch(console.error)
