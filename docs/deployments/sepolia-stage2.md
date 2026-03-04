# Sepolia Deployment Record (Stage 2)

Date: 2026-03-04

## Contracts
- GhostToken: `0xB9431b3be9a56a1eeA8E728326332f8B4dD51382`
  - Tx: `0x34e2adfddd8ba99de76d62e9000e44d403490b8dcbdf03fc92d63d653384b064`
- GhostFundVault: `0x4964991514f731CB3CF252108dFF889d30036fcb`
  - Tx: `0x9a02f3e5830b4999ac3b23ccbba69ebe8440c1668895e0c170056f8878cf67e6`

## Funding Transaction
- Transfer 100,000 GHOST to vault
  - Tx: `0x5cefbc6571ca4d314104e57b2fc1761e083de0beb07346f902c509b619b832c6`

## Verification
- `getVaultBalance(GHOST_TOKEN_ADDRESS)` returned `100000000000000000000000` (100k GHOST @ 18 decimals).

## Operational Note
- Current deployment used deployer placeholder values for forwarder/workflow owner during constructor wiring.
- Before enabling live CRE reports, run:

```bash
cd contracts
forge script scripts/ConfigureVaultAccess.s.sol:ConfigureVaultAccess \
  --rpc-url "$SEPOLIA_RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast
```

Required env vars:
- `GHOSTFUND_VAULT_ADDRESS`
- `KEYSTONE_FORWARDER`
- Optional `WORKFLOW_OWNER` (defaults to deployer address)
