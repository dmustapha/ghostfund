#!/usr/bin/env bash
set -euo pipefail

# Select the first healthy Sepolia RPC from env vars.
# Order: SEPOLIA_RPC_URL, SEPOLIA_RPC_URL_FALLBACK, SEPOLIA_RPC_URL_TERTIARY

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  set -a && source "$ENV_FILE" && set +a
fi

CANDIDATES=(
  "${SEPOLIA_RPC_URL:-}"
  "${SEPOLIA_RPC_URL_FALLBACK:-}"
  "${SEPOLIA_RPC_URL_TERTIARY:-}"
)

for rpc in "${CANDIDATES[@]}"; do
  [[ -z "$rpc" ]] && continue
  code=$(curl -s -o /tmp/gf_rpc_check.json -w "%{http_code}" \
    "$rpc" \
    -H 'content-type: application/json' \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' || true)

  if [[ "$code" == "200" ]] && grep -q '"result":"0x' /tmp/gf_rpc_check.json; then
    printf "%s\n" "$rpc"
    exit 0
  fi
done

echo "No healthy Sepolia RPC endpoint found in .env" >&2
exit 1
