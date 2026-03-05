import 'dotenv/config'
import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { PT_DOMAIN, PT_TYPES, PT_API_BASE } from './constants.js'

const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}` as `0x${string}`)

createWalletClient({
  account,
  chain: sepolia,
  transport: http(),
})

export async function signPTRequest<T extends keyof typeof PT_TYPES>(
  primaryType: T,
  message: Record<string, unknown>
): Promise<string> {
  return account.signTypedData({
    domain: PT_DOMAIN,
    types: PT_TYPES,
    primaryType,
    message,
  })
}

export function currentTimestamp(): bigint {
  return BigInt(Math.floor(Date.now() / 1000))
}

export async function checkBalance(
  accountAddress: string
): Promise<{ balances: Array<{ token: string; amount: string }> }> {
  const timestamp = currentTimestamp()
  const message = { account: accountAddress, timestamp }

  const signature = await signPTRequest('Retrieve Balances', message)

  const response = await fetch(`${PT_API_BASE}/balances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      account: accountAddress,
      timestamp: timestamp.toString(),
      auth: signature,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`/balances failed: ${error.error}`)
  }

  return response.json()
}

export async function generateShieldedAddress(
  accountAddress: string
): Promise<{ address: string }> {
  const timestamp = currentTimestamp()
  const message = { account: accountAddress, timestamp }

  const signature = await signPTRequest('Generate Shielded Address', message)

  const response = await fetch(`${PT_API_BASE}/shielded-address`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      account: accountAddress,
      timestamp: timestamp.toString(),
      auth: signature,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`/shielded-address failed: ${error.error}`)
  }

  return response.json()
}

export async function privateTransfer(
  senderAddress: string,
  recipientAddress: string,
  tokenAddress: string,
  amount: string,
  flags: string[] = ['hide-sender']
): Promise<{ transaction_id: string }> {
  const timestamp = currentTimestamp()
  const message = {
    account: senderAddress,
    recipient: recipientAddress,
    token: tokenAddress,
    amount: BigInt(amount),
    flags,
    timestamp,
  }

  const signature = await signPTRequest('Private Token Transfer', message)

  const response = await fetch(`${PT_API_BASE}/private-transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      account: senderAddress,
      recipient: recipientAddress,
      token: tokenAddress,
      amount,
      flags,
      timestamp: timestamp.toString(),
      auth: signature,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`/private-transfer failed: ${error.error}`)
  }

  return response.json()
}

export async function getWithdrawTicket(
  accountAddress: string,
  tokenAddress: string,
  amount: string
): Promise<{ ticket: string; deadline: number }> {
  const timestamp = currentTimestamp()
  const message = {
    account: accountAddress,
    token: tokenAddress,
    amount: BigInt(amount),
    timestamp,
  }

  const signature = await signPTRequest('Withdraw Tokens', message)

  const response = await fetch(`${PT_API_BASE}/withdraw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      account: accountAddress,
      token: tokenAddress,
      amount,
      timestamp: timestamp.toString(),
      auth: signature,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`/withdraw failed: ${error.error}`)
  }

  return response.json()
}

export async function listTransactions(
  accountAddress: string
): Promise<{ transactions: Array<unknown> }> {
  const timestamp = currentTimestamp()
  const message = { account: accountAddress, timestamp }

  const signature = await signPTRequest('List Transactions', message)

  const response = await fetch(`${PT_API_BASE}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      account: accountAddress,
      timestamp: timestamp.toString(),
      auth: signature,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`/transactions failed: ${error.error}`)
  }

  return response.json()
}

export { account }
