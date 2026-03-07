# GhostFund V2

**Compliant private DeFi yield vault powered by Chainlink CRE, Private Transactions, and ACE.**

GhostFund V2 automates yield strategy on Aave V3 with human-in-the-loop approval, moves funds privately through Chainlink Private Transactions, and enforces compliance policies via the Access Control Engine (ACE) — all on Sepolia testnet.

## Problem

DeFi yield strategies face three challenges:
1. **Autonomous risk** — AI/automated strategies can move funds without oversight, leading to losses
2. **Privacy** — on-chain fund movements are fully visible, enabling front-running and competitive intelligence leaks
3. **Compliance** — no enforcement layer for allowlists, deposit limits, or emergency pauses

## Solution

GhostFund V2 solves all three using Chainlink's new infrastructure:

- **CRE (Compute Runtime Environment)** monitors Aave conditions and recommends strategies — but never executes autonomously. The vault owner must explicitly approve each recommendation within a 1-hour TTL window.
- **Private Transactions (PT)** enable shielded token transfers where sender identity is hidden. Funds move privately and are redeemed on-chain via cryptographic withdraw tickets.
- **ACE (Access Control Engine)** enforces compliance at the policy engine level — allowlists, max deposit caps, and emergency pause — with a custom `DepositExtractor` for parameter extraction.

## Architecture

```
CRE Workflow (Cron + EVM reads)
  |-- reads Aave V3 reserve data (liquidity rate, aToken balance)
  |-- applies strategy logic (APY threshold + hysteresis + dust guard)
  |-- writes signed recommendation via onReport()
  v
GhostFundVault (Sepolia)
  |-- stores Recommendation (action, token, amount, APY, timestamp)
  |-- owner calls userApprove(recId) within 1-hour TTL
  |-- executes deposit/withdraw to Aave V3 Pool
  v
Private Transactions + ACE
  |-- GhostToken registered in PT Vault with PolicyEngine
  |-- private transfers hide sender (EIP-712 authenticated)
  |-- withdraw tickets redeemed on-chain via withdrawWithTicket()
  |-- PolicyEngine enforces: AllowPolicy, MaxPolicy, PausePolicy
```

## Key Features

### Human-in-the-Loop Approval
The CRE workflow recommends but never executes. Strategy execution requires explicit `userApprove()` from the vault owner. Expired recommendations (>1 hour) are permanently rejected.

### Privacy-Preserving Fund Movement
Token transfers through the PT API hide the sender address. Recipients receive funds via shielded addresses. On-chain redemption uses cryptographic tickets — the public chain sees the withdrawal but not the transfer origin.

### Policy Enforcement
Three ACE policies protect the vault:
- **AllowPolicy** — only whitelisted addresses can deposit
- **MaxPolicy** — enforces maximum deposit amounts
- **PausePolicy** — emergency circuit breaker, toggleable by admin

A custom `DepositExtractor` contract extracts named parameters from calldata for policy evaluation.

### Strategy Logic
- Deposits when APY exceeds configurable threshold and idle balance exceeds `minDepositAmount` (dust guard)
- Withdraws when APY drops below half the threshold (hysteresis prevents oscillation)
- No action when conditions are unchanged

## Deployed Contracts (Sepolia)

| Contract | Address |
|----------|---------|
| GhostFundVault | `0x4964991514f731CB3CF252108dFF889d30036fcb` |
| GhostToken | `0xB9431b3be9a56a1eeA8E728326332f8B4dD51382` |
| PolicyEngine | `0x73247d30cb15eF7884D8f8992D7D1692c7f6a1E4` |
| AllowPolicy | `0xB9fa55C5f14Fac82e6b9133284bE9EF912dbA33e` |
| MaxPolicy | `0xfD46dE36745402238826672af2132e59f1caDbBA` |
| PausePolicy | `0x9A9a6BB879F51A89A340305d1fFf92A0873A938f` |
| DepositExtractor | `0x15fb3265fefc1cB42A2c990DED55fb3a448689d4` |
| PT Vault | `0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13` |
| Aave V3 Pool | `0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951` |

## Getting Started

### Prerequisites

- [Foundry](https://book.getfoundry.sh/) (forge, cast)
- [Bun](https://bun.sh/) (v1.0+)
- [CRE CLI](https://github.com/smartcontractkit/cre-cli) (v1.2+)

### Setup

```bash
# Clone and configure
cp .env.example .env
# Fill in PRIVATE_KEY and SEPOLIA_RPC_URL

# Install dependencies
cd contracts && forge install
cd ../scripts && bun install
cd ../workflow/workflow && bun install
```

### Run Tests

```bash
# Unit, fuzz, invariant, and security tests (66 total)
cd contracts && forge test

# Fork tests against live Aave Sepolia
forge test --match-contract ForkTest --fork-url $SEPOLIA_RPC_URL
```

### Run Demo Flows

All demos run from the project root:

```bash
# Yield: CRE simulation -> recommendation -> Aave position
bun run scripts/demo-yield-flow.ts

# Privacy: PT balance -> shielded address -> private transfer -> on-chain redeem
bun run scripts/demo-privacy-flow.ts

# Compliance: allowlist -> policy enforcement -> max limit -> pause/unpause
bun run scripts/demo-compliance-flow.ts
```

### CRE Workflow

```bash
cd workflow/workflow && bun install
cd .. && ~/.cre/bin/cre simulate
```

## Test Coverage

| Suite | Tests | Status |
|-------|-------|--------|
| Unit | 44 | Pass |
| Fuzz (1000 runs each) | 7 | Pass |
| Invariant (8192 calls) | 4 | Pass |
| Security | 5 | Pass |
| Fork (live Aave Sepolia) | 6 | Pass |
| **Total** | **66** | **All pass** |

## Chainlink Capabilities Used

| Capability | Usage |
|------------|-------|
| CRE `CronCapability` | Scheduled workflow trigger |
| CRE `EVMClient.callContract` | Read Aave reserve data + vault balances |
| CRE `EVMClient.writeReport` | Write signed recommendation to vault |
| CRE `runtime.report()` | Consensus-signed report payload |
| Private Transactions API | Shielded transfers, balance queries, withdraw tickets |
| ACE PolicyEngine | Policy enforcement (allow, max, pause) |
| ACE DepositExtractor | Custom parameter extraction for deposit checks |

## Project Structure

```
ghostfund-v2/
  contracts/
    src/
      GhostFundVault.sol      # Core vault with Aave integration + approval pattern
      GhostToken.sol           # ERC-20 token registered in PT
      DepositExtractor.sol     # ACE parameter extractor for policy checks
    test/                      # Unit, fuzz, invariant, security, fork tests
    scripts/                   # Foundry deploy + configure scripts
  scripts/
    demo-yield-flow.ts         # End-to-end yield demo
    demo-privacy-flow.ts       # End-to-end privacy demo
    demo-compliance-flow.ts    # End-to-end compliance demo
    lib/
      pt-client.ts             # PT API client (EIP-712 auth)
      abis.ts                  # Shared ABI library
      constants.ts             # Addresses + PT type definitions
  workflow/
    workflow/
      main.ts                  # CRE workflow (strategy logic)
      config.json              # Strategy parameters
    project.yaml               # CRE project config
```

## Hackathon Tracks

- **Privacy Track** (primary) — Private Transactions for shielded fund movement
- **DeFi & Tokenization Track** (secondary) — Automated yield strategy with human oversight

## License

MIT
