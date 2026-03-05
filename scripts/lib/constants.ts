export const PT_VAULT_ADDRESS = '0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13'
export const PT_API_BASE = 'https://convergence2026-token-api.cldev.cloud'
export const SEPOLIA_CHAIN_ID = 11155111

export const PT_DOMAIN = {
  name: 'CompliantPrivateTokenDemo',
  version: '0.0.1',
  chainId: SEPOLIA_CHAIN_ID,
  verifyingContract: PT_VAULT_ADDRESS as `0x${string}`,
} as const

export const PT_TYPES = {
  'Retrieve Balances': [
    { name: 'account', type: 'address' },
    { name: 'timestamp', type: 'uint256' },
  ],
  'List Transactions': [
    { name: 'account', type: 'address' },
    { name: 'timestamp', type: 'uint256' },
    { name: 'cursor', type: 'string' },
    { name: 'limit', type: 'uint256' },
  ],
  'Private Token Transfer': [
    { name: 'sender', type: 'address' },
    { name: 'recipient', type: 'address' },
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'flags', type: 'string[]' },
    { name: 'timestamp', type: 'uint256' },
  ],
  'Withdraw Tokens': [
    { name: 'account', type: 'address' },
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'timestamp', type: 'uint256' },
  ],
  'Generate Shielded Address': [
    { name: 'account', type: 'address' },
    { name: 'timestamp', type: 'uint256' },
  ],
} as const
