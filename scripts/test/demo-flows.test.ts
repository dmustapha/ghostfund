import { describe, it, expect } from 'vitest'

// These are helper functions extracted from the demo flow scripts.
// We test the pure logic that doesn't require network access.

// From demo-yield-flow.ts
function parseCastUint(raw: string): bigint {
  const token = raw.trim().split(/\s+/)[0]
  return BigInt(token)
}

function normalizePrivateKey(raw: string): string {
  return raw.startsWith('0x') ? raw : `0x${raw}`
}

// From demo-privacy-flow.ts
function parseFirstAddress(text: string): string {
  const m = text.match(/0x[a-fA-F0-9]{40}/)
  if (!m) throw new Error('No address found in output')
  return m[0]
}

function parseJsonAfterLabel(text: string, label: string): any {
  const idx = text.indexOf(label)
  if (idx < 0) throw new Error(`Missing label ${label}`)
  const jsonStart = text.indexOf('{', idx)
  if (jsonStart < 0) throw new Error(`Missing JSON object after ${label}`)
  return JSON.parse(text.slice(jsonStart))
}

describe('demo-yield-flow helpers', () => {
  describe('parseCastUint', () => {
    it('parses simple integer', () => {
      expect(parseCastUint('1000')).toBe(1000n)
    })

    it('parses with trailing whitespace and text', () => {
      expect(parseCastUint('42 [uint256]')).toBe(42n)
    })

    it('parses large numbers', () => {
      expect(parseCastUint('115792089237316195423570985008687907853269984665640564039457584007913129639935')).toBe(
        115792089237316195423570985008687907853269984665640564039457584007913129639935n
      )
    })

    it('handles leading/trailing whitespace', () => {
      expect(parseCastUint('  100  ')).toBe(100n)
    })
  })

  describe('normalizePrivateKey', () => {
    it('adds 0x prefix when missing', () => {
      expect(normalizePrivateKey('abcdef')).toBe('0xabcdef')
    })

    it('preserves 0x prefix when present', () => {
      expect(normalizePrivateKey('0xabcdef')).toBe('0xabcdef')
    })
  })
})

describe('demo-privacy-flow helpers', () => {
  describe('parseFirstAddress', () => {
    it('extracts 0x address from text', () => {
      const text = 'Generated shielded address: 0x1234567890abcdef1234567890abcdef12345678 for account'
      expect(parseFirstAddress(text)).toBe('0x1234567890abcdef1234567890abcdef12345678')
    })

    it('throws on text without address', () => {
      expect(() => parseFirstAddress('no address here')).toThrow('No address found in output')
    })

    it('returns first address when multiple present', () => {
      const text = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa then 0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
      expect(parseFirstAddress(text)).toBe('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
    })
  })

  describe('parseJsonAfterLabel', () => {
    it('finds JSON after label', () => {
      const text = 'some preamble\nWithdrawTicket: {"ticket":"0xabc","amount":"1000"}'
      const result = parseJsonAfterLabel(text, 'WithdrawTicket:')
      expect(result).toEqual({ ticket: '0xabc', amount: '1000' })
    })

    it('throws on missing label', () => {
      expect(() => parseJsonAfterLabel('no label here', 'WithdrawTicket:')).toThrow('Missing label')
    })

    it('throws when no JSON object after label', () => {
      expect(() => parseJsonAfterLabel('WithdrawTicket: just text', 'WithdrawTicket:')).toThrow(
        'Missing JSON object'
      )
    })

    it('handles label with JSON on next line', () => {
      const text = 'WithdrawTicket:\n{"ticket":"0x123","deadline":9999}'
      const result = parseJsonAfterLabel(text, 'WithdrawTicket:')
      expect(result).toEqual({ ticket: '0x123', deadline: 9999 })
    })
  })
})
