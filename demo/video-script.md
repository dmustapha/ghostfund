# GhostFund V2 Demo Script (3-5 min)

## Scene 1: Problem (30s)
"DeFi is transparent by default. Anyone can inspect your wallets and strategy. Privacy tools without compliance are not institution-ready. GhostFund V2 shows privacy and compliance together."

## Scene 2: Architecture (30s)
- Show README architecture section.
- "CRE orchestrates strategy recommendations, GhostFundVault enforces user approval, Aave executes yield, and Private Transactions handle invisible movement with ACE policy checks."

## Scene 3: CRE Workflow (60s)
Run:
```bash
cd scripts
set -a && source ../.env && set +a
bun run demo-yield-flow.ts
```
Narration:
- "CRE reads Aave APY and vault balances."
- "If action is needed, recommendation lands on-chain and user approves."
- "In this rehearsal state, recommendation is already executed, so the workflow skips and still verifies live Aave position."

## Scene 4: User Approval (30s)
- Show `userApprove(uint256)` transaction from earlier successful runs (Sepolia explorer).
- "No funds move without explicit approval. CRE recommends, the user executes."

## Scene 5: Private Transactions (60s)
Run:
```bash
cd scripts
set -a && source ../.env && set +a
bun run demo-privacy-flow.ts
```
Narration:
- "Generate Bob shielded address."
- "Private transfer succeeds with transaction_id."
- "No direct public transfer trace for the private transfer itself."
- "Withdraw ticket is redeemed on-chain."

## Scene 6: Compliance (30s)
Run:
```bash
cd scripts
set -a && source ../.env && set +a
bun run demo-compliance-flow.ts
```
Narration:
- "AllowPolicy permits whitelisted users and blocks non-whitelisted users."
- "MaxPolicy/PausePolicy hooks are included in script and can be enabled when those addresses are configured."

## Scene 7: Close (30s)
"GhostFund V2 combines CRE automation, private transactions, and on-chain compliance controls for institution-grade private DeFi workflows."

## Recording Notes
- Keep terminal font large.
- Keep each scene as a separate take.
- Target total runtime: 3-5 minutes.
- Keep Sepolia explorer tab ready for tx hash proof points.
