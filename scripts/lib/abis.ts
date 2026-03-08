import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = path.join(ROOT, 'contracts', 'out')

function loadAbi(contract: string, file: string) {
  const json = JSON.parse(readFileSync(path.join(OUT, file, `${contract}.json`), 'utf-8'))
  return json.abi
}

export const vaultAbi = loadAbi('GhostFundVault', 'GhostFundVault.sol')
export const ghostTokenAbi = loadAbi('GhostToken', 'GhostToken.sol')

// ACE ABIs — not compiled locally, kept inline as single source of truth
export const allowAbiCandidates = [
  {
    type: 'function' as const,
    name: 'isAllowed',
    stateMutability: 'view' as const,
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function' as const,
    name: 'addressAllowed',
    stateMutability: 'view' as const,
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const
