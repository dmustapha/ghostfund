# GhostFund V2

GhostFund V2 is a compliant private DeFi vault on Sepolia: CRE monitors Aave conditions and writes signed strategy recommendations, users explicitly approve execution, and private token movement runs through Chainlink Private Transactions with ACE-backed policy enforcement.

## Architecture

```text
CRE Workflow (Cron + HTTP + EVM)
  ├─ reads Aave reserve data + price data
  ├─ computes recommendation (deposit/withdraw/no action)
  └─ writeReport() -> GhostFundVault.onReport()

GhostFundVault (on Sepolia)
  ├─ stores recommendations from CRE
  ├─ userApprove(recId) executes strategy
  └─ integrates with Aave V3 Pool supply/withdraw

Private Transactions + ACE
  ├─ token registered in PT vault with PolicyEngine
  ├─ private-transfer keeps movement off public Etherscan flow
  └─ withdraw ticket redeemed on-chain via withdrawWithTicket()
```

## Deployed Addresses (Sepolia)

- `GHOST_TOKEN_ADDRESS`: `0xB9431b3be9a56a1eeA8E728326332f8B4dD51382`
- `GHOSTFUND_VAULT_ADDRESS`: `0x4964991514f731CB3CF252108dFF889d30036fcb`
- `POLICY_ENGINE_ADDRESS`: `0xe042EdafF961fFA32DDBed985072d44ac954346D`
- `ALLOW_POLICY_ADDRESS`: `0x3c0331A8B7a4543284a05990432B3Bb2f2a749Ba`
- `PT_VAULT_ADDRESS`: `0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13`
- `AAVE_POOL`: `0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951`

## How To Run

1. Prerequisites
- Foundry (`forge`, `cast`)
- Bun (`/Users/MAC/.bun/bin/bun`)
- CRE CLI (`/Users/MAC/.cre/bin/cre`)
- `.env` populated (see `.env.example`)

2. Contracts tests
```bash
cd contracts
forge test -vvv
```

3. PT scripts setup
```bash
cd scripts
bun install
```

4. Run PT endpoint scripts
```bash
cd scripts
set -a && source ../.env && set +a
bun run pt-check-balance.ts
bun run pt-shielded-address.ts
bun run pt-private-transfer.ts
bun run pt-list-transactions.ts
bun run pt-withdraw.ts
```

5. Run demo flows
```bash
cd scripts
set -a && source ../.env && set +a
bun run demo-yield-flow.ts
bun run demo-privacy-flow.ts
bun run demo-compliance-flow.ts
```

## CRE Capabilities Used

| # | Capability | Where Used | Verified |
|---|---|---|---|
| 1 | `CronCapability` | Scheduled workflow trigger | Yes |
| 2 | `EVMClient.callContract` | Read Aave reserve + balances | Yes |
| 3 | `EVMClient.writeReport` | Write recommendation to vault | Yes |
| 4 | `runtime.report()` | Consensus-signed report payload | Yes |
| 5 | `HTTPClient` | Price API fetch | Yes |
| 6 | `ConfidentialHttpClient` | PT API privacy calls | Unverified in local sim; HTTP fallback used |
| 7 | CRE Secrets / Vault DON | Signing key management in workflow | Unverified in local sim |

## Demo Video

- Placeholder: `TBD (Day 6 upload)`

## Hackathon Tracks

- Privacy Track (primary)
- DeFi & Tokenization Track (secondary)
