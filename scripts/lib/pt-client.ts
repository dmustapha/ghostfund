import 'dotenv/config'
import { privateKeyToAccount } from 'viem/accounts'
import { PT_DOMAIN, PT_TYPES, PT_API_BASE } from './constants.js'

type PTSigner = ReturnType<typeof privateKeyToAccount>

let _defaultAccount: PTSigner | null = null
function getDefaultAccount(): PTSigner {
  if (!_defaultAccount) {
    const raw = process.env.PRIVATE_KEY
    if (!raw) throw new Error('PRIVATE_KEY environment variable is required for PT operations')
    const normalized = raw.startsWith('0x') ? raw.slice(2) : raw
    _defaultAccount = privateKeyToAccount(`0x${normalized}` as `0x${string}`)
  }
  return _defaultAccount
}

export function accountFromPrivateKey(rawPrivateKey: string): PTSigner {
  const normalized = rawPrivateKey.startsWith('0x') ? rawPrivateKey.slice(2) : rawPrivateKey
  return privateKeyToAccount(`0x${normalized}` as `0x${string}`)
}

export async function signPTRequest<T extends keyof typeof PT_TYPES>(
  primaryType: T,
  message: Record<string, unknown>,
  signer?: PTSigner
): Promise<string> {
  const s = signer ?? getDefaultAccount()
  return s.signTypedData({
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
  accountAddress: string,
  signer?: PTSigner
): Promise<{ balances: Array<{ token: string; amount: string }> }> {
  const timestamp = currentTimestamp()
  const message = { account: accountAddress, timestamp }

  const signature = await signPTRequest('Retrieve Balances', message, signer)

  const response = await fetch(`${PT_API_BASE}/balances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      account: accountAddress,
      timestamp: Number(timestamp),
      auth: signature,
    }),
  })

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`
    try {
      const body = await response.json()
      errorMsg = body.error || JSON.stringify(body)
    } catch {
      errorMsg = await response.text().catch(() => errorMsg)
    }
    throw new Error(`/balances failed: ${errorMsg}`)
  }

  return response.json()
}

export async function generateShieldedAddress(
  accountAddress: string,
  signer?: PTSigner
): Promise<{ address: string }> {
  const timestamp = currentTimestamp()
  const message = { account: accountAddress, timestamp }

  const signature = await signPTRequest('Generate Shielded Address', message, signer)

  const response = await fetch(`${PT_API_BASE}/shielded-address`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      account: accountAddress,
      timestamp: Number(timestamp),
      auth: signature,
    }),
  })

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`
    try {
      const body = await response.json()
      errorMsg = body.error || JSON.stringify(body)
    } catch {
      errorMsg = await response.text().catch(() => errorMsg)
    }
    throw new Error(`/shielded-address failed: ${errorMsg}`)
  }

  return response.json()
}

export async function privateTransfer(
  senderAddress: string,
  recipientAddress: string,
  tokenAddress: string,
  amount: string,
  flags: string[] = ['hide-sender'],
  signer?: PTSigner
): Promise<{ transaction_id: string }> {
  const timestamp = currentTimestamp()
  const message = {
    sender: senderAddress,
    recipient: recipientAddress,
    token: tokenAddress,
    amount: BigInt(amount),
    flags,
    timestamp,
  }

  const signature = await signPTRequest('Private Token Transfer', message, signer)

  const response = await fetch(`${PT_API_BASE}/private-transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      account: senderAddress,
      recipient: recipientAddress,
      token: tokenAddress,
      amount,
      flags,
      timestamp: Number(timestamp),
      auth: signature,
    }),
  })

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`
    try {
      const body = await response.json()
      errorMsg = body.error || JSON.stringify(body)
    } catch {
      errorMsg = await response.text().catch(() => errorMsg)
    }
    throw new Error(`/private-transfer failed: ${errorMsg}`)
  }

  return response.json()
}

export async function getWithdrawTicket(
  accountAddress: string,
  tokenAddress: string,
  amount: string,
  signer?: PTSigner
): Promise<{ ticket: string; deadline: number }> {
  const timestamp = currentTimestamp()
  const message = {
    account: accountAddress,
    token: tokenAddress,
    amount: BigInt(amount),
    timestamp,
  }

  const signature = await signPTRequest('Withdraw Tokens', message, signer)

  const response = await fetch(`${PT_API_BASE}/withdraw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      account: accountAddress,
      token: tokenAddress,
      amount,
      timestamp: Number(timestamp),
      auth: signature,
    }),
  })

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`
    try {
      const body = await response.json()
      errorMsg = body.error || JSON.stringify(body)
    } catch {
      errorMsg = await response.text().catch(() => errorMsg)
    }
    throw new Error(`/withdraw failed: ${errorMsg}`)
  }

  return response.json()
}

export async function listTransactions(
  accountAddress: string,
  limit = 10,
  cursor = '',
  signer?: PTSigner
): Promise<{ transactions: Array<unknown> }> {
  const timestamp = currentTimestamp()
  const message = { account: accountAddress, timestamp, cursor, limit }

  const signature = await signPTRequest('List Transactions', message, signer)

  const response = await fetch(`${PT_API_BASE}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      account: accountAddress,
      timestamp: Number(timestamp),
      limit,
      ...(cursor ? { cursor } : {}),
      auth: signature,
    }),
  })

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`
    try {
      const body = await response.json()
      errorMsg = body.error || JSON.stringify(body)
    } catch {
      errorMsg = await response.text().catch(() => errorMsg)
    }
    throw new Error(`/transactions failed: ${errorMsg}`)
  }

  return response.json()
}

export { getDefaultAccount }
