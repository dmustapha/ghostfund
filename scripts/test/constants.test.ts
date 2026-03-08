import { describe, it, expect } from 'vitest'
import {
  PT_VAULT_ADDRESS,
  PT_API_BASE,
  SEPOLIA_CHAIN_ID,
  PT_DOMAIN,
  PT_TYPES,
} from '../lib/constants.js'

describe('constants', () => {
  it('PT_VAULT_ADDRESS is valid Ethereum address', () => {
    expect(PT_VAULT_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/)
  })

  it('PT_API_BASE is valid URL', () => {
    expect(() => new URL(PT_API_BASE)).not.toThrow()
    expect(PT_API_BASE).toMatch(/^https?:\/\//)
  })

  it('SEPOLIA_CHAIN_ID is 11155111', () => {
    expect(SEPOLIA_CHAIN_ID).toBe(11155111)
  })

  it('PT_DOMAIN has correct shape', () => {
    expect(PT_DOMAIN).toHaveProperty('name')
    expect(PT_DOMAIN).toHaveProperty('version')
    expect(PT_DOMAIN).toHaveProperty('chainId', SEPOLIA_CHAIN_ID)
    expect(PT_DOMAIN).toHaveProperty('verifyingContract', PT_VAULT_ADDRESS)
  })

  it('PT_TYPES has entries for all 5 operations', () => {
    const expectedKeys = [
      'Retrieve Balances',
      'List Transactions',
      'Private Token Transfer',
      'Withdraw Tokens',
      'Generate Shielded Address',
    ]
    for (const key of expectedKeys) {
      expect(PT_TYPES).toHaveProperty(key)
    }
  })

  it('each PT_TYPE has correct field names and Solidity types', () => {
    // Validate each type has name/type pairs
    for (const [, fields] of Object.entries(PT_TYPES)) {
      expect(Array.isArray(fields)).toBe(true)
      for (const field of fields as unknown as Array<{ name: string; type: string }>) {
        expect(field).toHaveProperty('name')
        expect(field).toHaveProperty('type')
        expect(typeof field.name).toBe('string')
        expect(typeof field.type).toBe('string')
        // Solidity types should be valid
        expect(field.type).toMatch(/^(address|uint256|string|string\[\]|bytes|bytes32|bool)$/)
      }
    }

    // Spot-check specific fields
    const balances = PT_TYPES['Retrieve Balances']
    expect(balances[0]).toEqual({ name: 'account', type: 'address' })
    expect(balances[1]).toEqual({ name: 'timestamp', type: 'uint256' })
  })
})
