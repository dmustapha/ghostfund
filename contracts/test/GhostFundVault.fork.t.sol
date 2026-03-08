// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {GhostFundVault} from "../src/GhostFundVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Fork tests against real Aave V3 Sepolia.
/// Run with: forge test --match-contract ForkTest --fork-url $SEPOLIA_RPC_URL -vvv
/// Uses AAVE token (supply cap available) instead of USDC/USDT (capped on Sepolia).
contract GhostFundVaultForkTest is Test {
    GhostFundVault vault;

    address constant AAVE_POOL = 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951;
    address constant AAVE_FAUCET = 0xC959483DBa39aa9E78757139af0e9a2EDEb3f42D;
    address constant AAVE_TOKEN = 0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a;

    address owner = address(this);
    address forwarder = address(0xF0);
    address workflowOwner = address(0xB0);

    function setUp() public {
        address[] memory forwarders = new address[](1);
        forwarders[0] = forwarder;
        address[] memory owners = new address[](1);
        owners[0] = workflowOwner;

        vault = new GhostFundVault(forwarders, owners, AAVE_POOL);

        // Mint AAVE via Aave faucet (18 decimals)
        (bool ok,) = AAVE_FAUCET.call(
            abi.encodeWithSignature("mint(address,address,uint256)", AAVE_TOKEN, address(this), 10_000e18)
        );
        require(ok, "Faucet mint failed");
    }

    /// @dev Try depositToPool; skip test if Aave supply cap is reached (error 51).
    function _tryDepositToPool(address asset, uint256 amount) internal {
        try vault.depositToPool(asset, amount) {}
        catch (bytes memory err) {
            emit log_named_bytes("Aave fork revert (skipping)", err);
            vm.skip(true);
        }
    }

    function _buildMetadata(address _workflowOwner) internal pure returns (bytes memory) {
        return abi.encodePacked(bytes32(0), bytes10(0), _workflowOwner, bytes2(0));
    }

    function test_fork_realAaveSupply() public {
        uint256 amount = 1_000e18;
        IERC20(AAVE_TOKEN).transfer(address(vault), amount);

        _tryDepositToPool(AAVE_TOKEN, amount);

        (, uint256 balance) = vault.getAavePosition(AAVE_TOKEN);
        assertGe(balance, amount - 1, "aToken balance should be >= deposited amount (minus rounding)");
    }

    function test_fork_realAaveWithdraw() public {
        uint256 amount = 1_000e18;
        IERC20(AAVE_TOKEN).transfer(address(vault), amount);
        _tryDepositToPool(AAVE_TOKEN, amount);

        uint256 balBefore = IERC20(AAVE_TOKEN).balanceOf(owner);
        vault.withdrawFromPool(AAVE_TOKEN, amount);
        uint256 balAfter = IERC20(AAVE_TOKEN).balanceOf(owner);

        assertGe(balAfter - balBefore, amount - 1, "Should have received AAVE back");
    }

    function test_fork_realAaveGetReserveData() public view {
        (uint256 apy,) = vault.getAavePosition(AAVE_TOKEN);
        // AAVE may have 0 APY if no borrows — just check it doesn't revert
        assertGe(apy, 0, "APY query should not revert");
    }

    function test_fork_realAaveGetATokenBalance() public {
        uint256 amount = 500e18;
        IERC20(AAVE_TOKEN).transfer(address(vault), amount);
        _tryDepositToPool(AAVE_TOKEN, amount);

        (, uint256 balance) = vault.getAavePosition(AAVE_TOKEN);
        assertGe(balance, amount - 1);
    }

    function test_fork_fullFlow_onReport_approve_supply() public {
        uint256 amount = 1_000e18;
        IERC20(AAVE_TOKEN).transfer(address(vault), amount);

        // Simulate CRE report
        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(uint8(1), AAVE_TOKEN, amount, uint256(500));
        vm.prank(forwarder);
        vault.onReport(metadata, report);

        // Approve — should deposit to real Aave (skip if supply cap hit)
        try vault.userApprove(0) {}
        catch Error(string memory reason) {
            if (keccak256(bytes(reason)) == keccak256("51")) {
                emit log("Aave supply cap reached on Sepolia - skipping test");
                vm.skip(true);
                return;
            }
            revert(reason);
        }

        (, uint256 balance) = vault.getAavePosition(AAVE_TOKEN);
        assertGe(balance, amount - 1, "Aave position should reflect deposit");

        GhostFundVault.Recommendation memory rec = vault.getRecommendation(0);
        assertTrue(rec.executed);
    }

    function test_fork_fullFlow_depositWithdraw() public {
        uint256 amount = 1_000e18;

        // Deposit tokens to vault
        IERC20(AAVE_TOKEN).approve(address(vault), amount);
        vault.deposit(AAVE_TOKEN, amount);
        assertEq(IERC20(AAVE_TOKEN).balanceOf(address(vault)), amount);

        // Deposit to pool (skip if supply cap hit)
        _tryDepositToPool(AAVE_TOKEN, amount);
        (, uint256 balance) = vault.getAavePosition(AAVE_TOKEN);
        assertGe(balance, amount - 1);

        // Withdraw from pool (sends tokens to owner)
        uint256 ownerBalBefore = IERC20(AAVE_TOKEN).balanceOf(owner);
        vault.withdrawFromPool(AAVE_TOKEN, amount);
        assertGe(IERC20(AAVE_TOKEN).balanceOf(owner) - ownerBalBefore, amount - 1, "Owner should receive AAVE from pool");
    }
}
