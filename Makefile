# GhostFund V2 — Test Runner
# Usage: make [target]  (default: test)

-include .env
export

# Pinned Sepolia block where Aave USDC pool has capacity
FORK_BLOCK ?= 7500000

.PHONY: check install test test-sol test-fuzz test-invariant test-security test-fork test-ts test-all coverage gas

# Default target
test: check test-sol test-fuzz test-invariant test-security test-ts
	@echo ""
	@echo "=========================================="
	@echo "  All local tests complete"
	@echo "=========================================="

check:
	@echo "=========================================="
	@echo "  Checking prerequisites"
	@echo "=========================================="
	@command -v forge >/dev/null 2>&1 || { echo "ERROR: forge not found. Install: https://book.getfoundry.sh"; exit 1; }
	@command -v bun >/dev/null 2>&1 || { echo "ERROR: bun not found. Install: https://bun.sh"; exit 1; }
	@test -f .env || { echo "ERROR: .env not found at project root"; exit 1; }
	@echo "  forge: $$(forge --version | head -1)"
	@echo "  bun:   $$(bun --version)"
	@echo "  .env:  found"
	@echo ""

install:
	@echo "=========================================="
	@echo "  Installing dependencies"
	@echo "=========================================="
	cd contracts && forge install
	cd scripts && bun install
	@echo ""

test-sol:
	@echo "=========================================="
	@echo "  Solidity unit tests (47)"
	@echo "=========================================="
	cd contracts && forge test --match-path test/GhostFundVault.t.sol -vv
	@echo ""

test-fuzz:
	@echo "=========================================="
	@echo "  Fuzz tests (8 × 1000 runs)"
	@echo "=========================================="
	cd contracts && forge test --match-path test/GhostFundVault.fuzz.t.sol -vv
	@echo ""

test-invariant:
	@echo "=========================================="
	@echo "  Invariant tests (3 × 256 runs)"
	@echo "=========================================="
	cd contracts && forge test --match-path test/GhostFundVault.invariant.t.sol -vv
	@echo ""

test-security:
	@echo "=========================================="
	@echo "  Security tests (5)"
	@echo "=========================================="
	cd contracts && forge test --match-path test/GhostFundVault.security.t.sol -vv
	@echo ""

test-fork:
	@echo "=========================================="
	@echo "  Fork tests — Sepolia Aave V3 (6)"
	@echo "=========================================="
	@if [ -z "$(SEPOLIA_RPC_URL)" ]; then \
		echo "  SKIPPED: SEPOLIA_RPC_URL not set in .env"; \
		echo ""; \
	else \
		cd contracts && forge test --match-path test/GhostFundVault.fork.t.sol --fork-url $(SEPOLIA_RPC_URL) --fork-block-number $(FORK_BLOCK) -vv; \
		echo ""; \
	fi

test-ts:
	@echo "=========================================="
	@echo "  TypeScript tests (46)"
	@echo "=========================================="
	cd scripts && bun run test
	@echo ""

test-all: check test-sol test-fuzz test-invariant test-security test-fork test-ts
	@echo ""
	@echo "=========================================="
	@echo "  All tests complete (including fork)"
	@echo "=========================================="

coverage:
	@echo "=========================================="
	@echo "  Solidity coverage"
	@echo "=========================================="
	cd contracts && forge coverage --no-match-path test/GhostFundVault.fork.t.sol
	@echo ""
	@echo "=========================================="
	@echo "  TypeScript coverage"
	@echo "=========================================="
	cd scripts && bun run test:coverage
	@echo ""

gas:
	@echo "=========================================="
	@echo "  Gas report"
	@echo "=========================================="
	cd contracts && forge test --gas-report --no-match-path test/GhostFundVault.fork.t.sol
	@echo ""
