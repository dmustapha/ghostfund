# RPC Reliability Runbook (Sepolia)

## 1) Choose a healthy RPC endpoint

```bash
cd ~/hackathon-toolkit/active/ghostfund-v2
RPC_URL=$(./scripts/lib/select-sepolia-rpc.sh)
echo "$RPC_URL"
```

## 2) Broadcast scripts with TLS/fork-safe flags

Use `--skip-simulation` when Forge fork simulation is flaky.

```bash
cd ~/hackathon-toolkit/active/ghostfund-v2/contracts
set -a && source ../.env && set +a
RPC_URL=$(../scripts/lib/select-sepolia-rpc.sh)

forge script scripts/ConfigureVaultAccess.s.sol:ConfigureVaultAccess \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast \
  --skip-simulation
```

## 3) Mandatory post-broadcast verification

Never trust script output alone. Verify state directly on-chain.

```bash
cd ~/hackathon-toolkit/active/ghostfund-v2
set -a && source .env && set +a
RPC_URL=$(./scripts/lib/select-sepolia-rpc.sh)

cast call "$GHOSTFUND_VAULT_ADDRESS" "allowedKeystoneForwarders(address)(bool)" "$KEYSTONE_FORWARDER" --rpc-url "$RPC_URL"
cast call "$GHOSTFUND_VAULT_ADDRESS" "allowedWorkflowOwners(address)(bool)" "$WORKFLOW_OWNER" --rpc-url "$RPC_URL"
```

## 4) Recommended endpoint order in `.env`

- `SEPOLIA_RPC_URL` -> primary (best provider)
- `SEPOLIA_RPC_URL_FALLBACK` -> secondary
- `SEPOLIA_RPC_URL_TERTIARY` -> optional backup

If possible, use a paid/stable provider for primary and keep public endpoints as fallback.
