import 'dotenv/config'
import { accountFromPrivateKey, generateShieldedAddress } from './lib/pt-client.js'

async function main() {
  const raw = process.env.BOB_PRIVATE_KEY ?? process.env.PRIVATE_KEY
  if (!raw) throw new Error('Missing BOB_PRIVATE_KEY/PRIVATE_KEY')
  const signer = accountFromPrivateKey(raw)
  const data = await generateShieldedAddress(signer.address, signer)
  console.log('Shielded:', JSON.stringify(data, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
