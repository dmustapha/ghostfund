import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { privateKeyToAccount } from 'viem/accounts'

// Use deterministic test private keys (Foundry's default anvil keys)
const TEST_PK = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
const TEST_ACCOUNT = privateKeyToAccount(TEST_PK)

// Valid Ethereum addresses for test params
const ADDR_RECIPIENT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' // Foundry #1
const ADDR_TOKEN = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' // Foundry #2

// Mock fetch globally
const mockFetch = vi.fn()

beforeEach(() => {
  mockFetch.mockClear()
  vi.stubGlobal('fetch', mockFetch)
  vi.stubEnv('PRIVATE_KEY', TEST_PK)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

async function importClient() {
  vi.resetModules()
  return import('../lib/pt-client.js')
}

describe('accountFromPrivateKey', () => {
  it('creates account from 0x-prefixed key', async () => {
    const { accountFromPrivateKey } = await importClient()
    const acct = accountFromPrivateKey(TEST_PK)
    expect(acct.address).toBe(TEST_ACCOUNT.address)
  })

  it('creates account from non-prefixed key', async () => {
    const { accountFromPrivateKey } = await importClient()
    const acct = accountFromPrivateKey(TEST_PK.slice(2))
    expect(acct.address).toBe(TEST_ACCOUNT.address)
  })

  it('both formats produce same address', async () => {
    const { accountFromPrivateKey } = await importClient()
    const a = accountFromPrivateKey(TEST_PK)
    const b = accountFromPrivateKey(TEST_PK.slice(2))
    expect(a.address).toBe(b.address)
  })
})

describe('currentTimestamp', () => {
  it('returns bigint', async () => {
    const { currentTimestamp } = await importClient()
    expect(typeof currentTimestamp()).toBe('bigint')
  })

  it('returns value close to current time', async () => {
    const { currentTimestamp } = await importClient()
    const ts = currentTimestamp()
    const now = BigInt(Math.floor(Date.now() / 1000))
    expect(ts).toBeGreaterThanOrEqual(now - 2n)
    expect(ts).toBeLessThanOrEqual(now + 2n)
  })
})

describe('signPTRequest', () => {
  it('produces valid EIP-712 signature', async () => {
    const { signPTRequest, accountFromPrivateKey } = await importClient()
    const signer = accountFromPrivateKey(TEST_PK)
    const sig = await signPTRequest(
      'Retrieve Balances',
      { account: signer.address, timestamp: 1234n },
      signer
    )
    expect(sig).toMatch(/^0x[a-fA-F0-9]{130}$/)
  })

  it('works with each primaryType', async () => {
    const { signPTRequest, accountFromPrivateKey } = await importClient()
    const signer = accountFromPrivateKey(TEST_PK)

    const types: Array<{ type: string; msg: Record<string, unknown> }> = [
      { type: 'Retrieve Balances', msg: { account: signer.address, timestamp: 1n } },
      { type: 'List Transactions', msg: { account: signer.address, timestamp: 1n, cursor: '', limit: 10n } },
      {
        type: 'Private Token Transfer',
        msg: {
          account: signer.address,
          recipient: ADDR_RECIPIENT,
          token: ADDR_TOKEN,
          amount: 1n,
          flags: ['hide-sender'],
          timestamp: 1n,
        },
      },
      { type: 'Withdraw Tokens', msg: { account: signer.address, token: ADDR_TOKEN, amount: 1n, timestamp: 1n } },
      { type: 'Generate Shielded Address', msg: { account: signer.address, timestamp: 1n } },
    ]

    for (const { type, msg } of types) {
      const sig = await signPTRequest(type as any, msg, signer)
      expect(sig).toMatch(/^0x/)
    }
  })
})

describe('checkBalance', () => {
  it('sends correct request body shape', async () => {
    const { checkBalance, accountFromPrivateKey } = await importClient()
    const signer = accountFromPrivateKey(TEST_PK)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ balances: [] }),
    })

    await checkBalance(signer.address, signer)

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toContain('/balances')
    const body = JSON.parse(opts.body)
    expect(body).toHaveProperty('account', signer.address)
    expect(body).toHaveProperty('timestamp')
    expect(body).toHaveProperty('auth')
  })

  it('includes auth signature in body', async () => {
    const { checkBalance, accountFromPrivateKey } = await importClient()
    const signer = accountFromPrivateKey(TEST_PK)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ balances: [] }),
    })

    await checkBalance(signer.address, signer)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.auth).toMatch(/^0x/)
  })

  it('throws on HTTP error with error message', async () => {
    const { checkBalance, accountFromPrivateKey } = await importClient()
    const signer = accountFromPrivateKey(TEST_PK)

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: 'forbidden' }),
    })

    await expect(checkBalance(signer.address, signer)).rejects.toThrow('/balances failed: forbidden')
  })

  it('returns parsed JSON on success', async () => {
    const { checkBalance, accountFromPrivateKey } = await importClient()
    const signer = accountFromPrivateKey(TEST_PK)

    const expected = { balances: [{ token: '0xabc', amount: '1000' }] }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => expected,
    })

    const result = await checkBalance(signer.address, signer)
    expect(result).toEqual(expected)
  })
})

describe('generateShieldedAddress', () => {
  it('sends correct endpoint and body', async () => {
    const { generateShieldedAddress, accountFromPrivateKey } = await importClient()
    const signer = accountFromPrivateKey(TEST_PK)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ address: '0x123' }),
    })

    await generateShieldedAddress(signer.address, signer)

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain('/shielded-address')
  })

  it('throws on HTTP error', async () => {
    const { generateShieldedAddress, accountFromPrivateKey } = await importClient()
    const signer = accountFromPrivateKey(TEST_PK)

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'internal' }),
    })

    await expect(generateShieldedAddress(signer.address, signer)).rejects.toThrow('/shielded-address failed')
  })

  it('returns address field', async () => {
    const { generateShieldedAddress, accountFromPrivateKey } = await importClient()
    const signer = accountFromPrivateKey(TEST_PK)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ address: '0xshielded' }),
    })

    const result = await generateShieldedAddress(signer.address, signer)
    expect(result.address).toBe('0xshielded')
  })
})

describe('privateTransfer', () => {
  it('sends all fields including flags', async () => {
    const { privateTransfer, accountFromPrivateKey } = await importClient()
    const signer = accountFromPrivateKey(TEST_PK)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transaction_id: 'tx1' }),
    })

    await privateTransfer(signer.address, ADDR_RECIPIENT, ADDR_TOKEN, '1000', ['hide-sender', 'hide-amount'], signer)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.account).toBe(signer.address)
    expect(body.recipient).toBe(ADDR_RECIPIENT)
    expect(body.token).toBe(ADDR_TOKEN)
    expect(body.amount).toBe('1000')
    expect(body.flags).toEqual(['hide-sender', 'hide-amount'])
  })

  it('default flags is [hide-sender]', async () => {
    const { privateTransfer, accountFromPrivateKey } = await importClient()
    const signer = accountFromPrivateKey(TEST_PK)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transaction_id: 'tx1' }),
    })

    await privateTransfer(signer.address, ADDR_RECIPIENT, ADDR_TOKEN, '1000', undefined, signer)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.flags).toEqual(['hide-sender'])
  })

  it('throws on HTTP error', async () => {
    const { privateTransfer, accountFromPrivateKey } = await importClient()
    const signer = accountFromPrivateKey(TEST_PK)

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'bad request' }),
    })

    await expect(
      privateTransfer(signer.address, ADDR_RECIPIENT, ADDR_TOKEN, '1', ['hide-sender'], signer)
    ).rejects.toThrow('/private-transfer failed')
  })
})

describe('getWithdrawTicket', () => {
  it('sends correct body', async () => {
    const { getWithdrawTicket, accountFromPrivateKey } = await importClient()
    const signer = accountFromPrivateKey(TEST_PK)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ticket: '0xticket', deadline: 9999 }),
    })

    await getWithdrawTicket(signer.address, ADDR_TOKEN, '500', signer)

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain('/withdraw')
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.token).toBe(ADDR_TOKEN)
    expect(body.amount).toBe('500')
  })

  it('returns ticket and deadline', async () => {
    const { getWithdrawTicket, accountFromPrivateKey } = await importClient()
    const signer = accountFromPrivateKey(TEST_PK)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ticket: '0xabc', deadline: 12345 }),
    })

    const result = await getWithdrawTicket(signer.address, ADDR_TOKEN, '1', signer)
    expect(result.ticket).toBe('0xabc')
    expect(result.deadline).toBe(12345)
  })
})

describe('listTransactions', () => {
  it('sends default limit and empty cursor', async () => {
    const { listTransactions, accountFromPrivateKey } = await importClient()
    const signer = accountFromPrivateKey(TEST_PK)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transactions: [] }),
    })

    await listTransactions(signer.address, undefined, undefined, signer)

    expect(mockFetch).toHaveBeenCalledOnce()
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.limit).toBe(10)
    expect(body).not.toHaveProperty('cursor')
  })

  it('sends custom limit and cursor', async () => {
    const { listTransactions, accountFromPrivateKey } = await importClient()
    const signer = accountFromPrivateKey(TEST_PK)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transactions: [] }),
    })

    await listTransactions(signer.address, 25, 'abc123', signer)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.limit).toBe(25)
    expect(body.cursor).toBe('abc123')
  })

  it('omits cursor key when empty', async () => {
    const { listTransactions, accountFromPrivateKey } = await importClient()
    const signer = accountFromPrivateKey(TEST_PK)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transactions: [] }),
    })

    await listTransactions(signer.address, 10, '', signer)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body).not.toHaveProperty('cursor')
  })
})
