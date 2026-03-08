#!/usr/bin/env bash
# GhostFund — Test Runner
# Usage: ./test.sh [--all|--coverage|--gas|--sol|--ts|--fork]

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

ROOT="$(cd "$(dirname "$0")" && pwd)"
PASSED=0
FAILED=0

header() {
  echo ""
  echo -e "${CYAN}==========================================${NC}"
  echo -e "${CYAN}  $1${NC}"
  echo -e "${CYAN}==========================================${NC}"
}

run_step() {
  if eval "$1"; then
    PASSED=$((PASSED + 1))
    echo -e "${GREEN}  PASS${NC}"
  else
    FAILED=$((FAILED + 1))
    echo -e "${RED}  FAIL${NC}"
  fi
}

check_prereqs() {
  header "Checking prerequisites"
  command -v forge >/dev/null 2>&1 || { echo -e "${RED}ERROR: forge not found${NC}"; exit 1; }
  command -v bun >/dev/null 2>&1 || { echo -e "${RED}ERROR: bun not found${NC}"; exit 1; }
  test -f "$ROOT/.env" || { echo -e "${RED}ERROR: .env not found${NC}"; exit 1; }
  echo "  forge: $(forge --version | head -1)"
  echo "  bun:   $(bun --version)"
  echo "  .env:  found"

  # shellcheck disable=SC1091
  source "$ROOT/.env"
  export SEPOLIA_RPC_URL="${SEPOLIA_RPC_URL:-}"
}

run_sol() {
  header "Solidity unit tests (47)"
  run_step "cd '$ROOT/contracts' && forge test --match-path test/GhostFundVault.t.sol -vv"
}

run_fuzz() {
  header "Fuzz tests (8 x 1000 runs)"
  run_step "cd '$ROOT/contracts' && forge test --match-path test/GhostFundVault.fuzz.t.sol -vv"
}

run_invariant() {
  header "Invariant tests (3 x 256 runs)"
  run_step "cd '$ROOT/contracts' && forge test --match-path test/GhostFundVault.invariant.t.sol -vv"
}

run_security() {
  header "Security tests (5)"
  run_step "cd '$ROOT/contracts' && forge test --match-path test/GhostFundVault.security.t.sol -vv"
}

run_fork() {
  header "Fork tests — Sepolia Aave V3 (6)"
  if [ -z "${SEPOLIA_RPC_URL:-}" ]; then
    echo -e "  ${CYAN}SKIPPED: SEPOLIA_RPC_URL not set in .env${NC}"
    return
  fi
  run_step "cd '$ROOT/contracts' && forge test --match-path test/GhostFundVault.fork.t.sol --fork-url '$SEPOLIA_RPC_URL' --fork-block-number 7500000 -vv"
}

run_ts() {
  header "TypeScript tests (46)"
  run_step "cd '$ROOT/scripts' && bun run test"
}

run_coverage() {
  header "Solidity coverage"
  run_step "cd '$ROOT/contracts' && forge coverage --no-match-path test/GhostFundVault.fork.t.sol"
  header "TypeScript coverage"
  run_step "cd '$ROOT/scripts' && bun run test:coverage"
}

run_gas() {
  header "Gas report"
  run_step "cd '$ROOT/contracts' && forge test --gas-report --no-match-path test/GhostFundVault.fork.t.sol"
}

summary() {
  echo ""
  echo -e "${CYAN}==========================================${NC}"
  if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}  $PASSED suite(s) passed, 0 failed${NC}"
  else
    echo -e "${RED}  $PASSED suite(s) passed, $FAILED failed${NC}"
  fi
  echo -e "${CYAN}==========================================${NC}"
  [ "$FAILED" -eq 0 ]
}

# --- Main ---

check_prereqs

case "${1:-}" in
  --all)
    run_sol; run_fuzz; run_invariant; run_security; run_fork; run_ts
    ;;
  --coverage)
    run_coverage
    ;;
  --gas)
    run_gas
    ;;
  --sol)
    run_sol; run_fuzz; run_invariant; run_security
    ;;
  --ts)
    run_ts
    ;;
  --fork)
    run_fork
    ;;
  "")
    run_sol; run_fuzz; run_invariant; run_security; run_ts
    ;;
  *)
    echo "Usage: $0 [--all|--coverage|--gas|--sol|--ts|--fork]"
    exit 1
    ;;
esac

summary
