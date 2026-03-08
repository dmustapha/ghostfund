import { describe, it, expect } from 'vitest'
import { runCommand } from '../lib/shell.js'

describe('runCommand', () => {
  it('returns stdout on success', () => {
    const result = runCommand({
      cmd: 'echo',
      args: ['hello world'],
      cwd: '.',
    })
    expect(result).toBe('hello world')
  })

  it('throws on non-zero exit code', () => {
    expect(() =>
      runCommand({
        cmd: 'bash',
        args: ['-c', 'exit 42'],
        cwd: '.',
      })
    ).toThrow('Command failed (42)')
  })

  it('throws on spawn error', () => {
    expect(() =>
      runCommand({
        cmd: 'nonexistent-binary-xyz-12345',
        args: [],
        cwd: '.',
      })
    ).toThrow('Command failed (spawn error)')
  })

  it('redacts secret values from output', () => {
    const result = runCommand({
      cmd: 'echo',
      args: ['my-secret-key-abc123'],
      cwd: '.',
      secretValues: ['my-secret-key-abc123'],
    })
    expect(result).toBe('[REDACTED]')
    expect(result).not.toContain('my-secret-key-abc123')
  })

  it('redacts secret values from error messages', () => {
    expect(() =>
      runCommand({
        cmd: 'bash',
        args: ['-c', 'echo "leaked: supersecret" >&2; exit 1'],
        cwd: '.',
        secretValues: ['supersecret'],
      })
    ).toThrow('[REDACTED]')
  })
})
