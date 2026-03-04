// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console} from "forge-std/Test.sol";
import {GhostFundVault} from "../src/GhostFundVault.sol";
import {GhostToken} from "../src/GhostToken.sol";
import {MockPool} from "../src/MockPool.sol";

contract GhostFundVaultTest is Test {
    GhostFundVault vault;
    GhostToken token;
    MockPool pool;

    address owner = address(this);
    address forwarder = address(0xF0);
    address workflowOwner = address(0xB0);
    address alice = address(0xA1);

    function setUp() public {
        // Deploy mock pool with 5% APY in RAY
        pool = new MockPool(50000000000000000000000000); // 5% in RAY

        // Deploy token and vault
        token = new GhostToken(1_000_000 ether);

        address[] memory forwarders = new address[](1);
        forwarders[0] = forwarder;
        address[] memory owners = new address[](1);
        owners[0] = workflowOwner;

        vault = new GhostFundVault(forwarders, owners, address(pool));

        // Fund vault with tokens
        token.transfer(address(vault), 100_000 ether);
    }

    // ═══════════════════════════════════════════
    // onReport tests
    // ═══════════════════════════════════════════

    function test_onReport_storesRecommendation() public {
        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(
            uint8(1), // DEPOSIT_TO_POOL
            address(token),
            uint256(50_000 ether),
            uint256(500) // 5.00% APY
        );

        vm.prank(forwarder);
        vault.onReport(metadata, report);

        (uint256 recId, GhostFundVault.Recommendation memory rec) = vault.getLatestRecommendation();
        assertEq(recId, 0);
        assertEq(uint8(rec.action), 1); // DEPOSIT_TO_POOL
        assertEq(rec.asset, address(token));
        assertEq(rec.amount, 50_000 ether);
        assertEq(rec.apy, 500);
        assertFalse(rec.executed);
    }

    function test_onReport_revertsIfNotForwarder() public {
        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(uint8(1), address(token), uint256(1000), uint256(500));

        vm.prank(alice); // Not a forwarder
        vm.expectRevert(GhostFundVault.MustBeKeystoneForwarder.selector);
        vault.onReport(metadata, report);
    }

    // ═══════════════════════════════════════════
    // userApprove tests
    // ═══════════════════════════════════════════

    function test_userApprove_executesDeposit() public {
        // First: send a report
        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(
            uint8(1), address(token), uint256(50_000 ether), uint256(500)
        );
        vm.prank(forwarder);
        vault.onReport(metadata, report);

        // Approve token spending by pool (vault needs to approve pool)
        // MockPool.supply does transferFrom, so vault needs allowance
        // Actually, _depositToPool calls token.approve(pool, amount) internally

        // Approve the recommendation
        vault.userApprove(0);

        GhostFundVault.Recommendation memory rec = vault.getRecommendation(0);
        assertTrue(rec.executed);
    }

    function test_userApprove_revertsIfExpired() public {
        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(
            uint8(1), address(token), uint256(1000), uint256(500)
        );
        vm.prank(forwarder);
        vault.onReport(metadata, report);

        // Warp 2 hours into the future
        vm.warp(block.timestamp + 2 hours);

        vm.expectRevert(GhostFundVault.RecommendationExpired.selector);
        vault.userApprove(0);
    }

    function test_userApprove_revertsIfAlreadyExecuted() public {
        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(
            uint8(1), address(token), uint256(50_000 ether), uint256(500)
        );
        vm.prank(forwarder);
        vault.onReport(metadata, report);

        vault.userApprove(0); // First approve

        vm.expectRevert(GhostFundVault.RecommendationAlreadyExecuted.selector);
        vault.userApprove(0); // Second approve — should fail
    }

    function test_userApprove_revertsIfNotOwner() public {
        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(
            uint8(1), address(token), uint256(1000), uint256(500)
        );
        vm.prank(forwarder);
        vault.onReport(metadata, report);

        vm.prank(alice); // Not owner
        vm.expectRevert(); // OwnerIsCreator revert
        vault.userApprove(0);
    }

    // ═══════════════════════════════════════════
    // Direct deposit/withdraw tests
    // ═══════════════════════════════════════════

    function test_deposit_transfersTokens() public {
        uint256 amount = 10_000 ether;
        token.approve(address(vault), amount);

        vault.deposit(address(token), amount);
        assertEq(token.balanceOf(address(vault)), 100_000 ether + amount);
    }

    function test_withdraw_transfersTokens() public {
        uint256 before = token.balanceOf(owner);

        vault.withdraw(address(token), 10_000 ether);
        assertEq(token.balanceOf(owner), before + 10_000 ether);
    }

    // ═══════════════════════════════════════════
    // View function tests
    // ═══════════════════════════════════════════

    function test_getVaultBalance() public view {
        assertEq(vault.getVaultBalance(address(token)), 100_000 ether);
    }

    function test_getLatestRecommendation_revertsIfEmpty() public {
        vm.expectRevert(GhostFundVault.RecommendationNotFound.selector);
        vault.getLatestRecommendation();
    }

    // ═══════════════════════════════════════════
    // Helpers
    // ═══════════════════════════════════════════

    /// @dev Build minimal metadata that KeystoneFeedDefaultMetadataLib can decode
    /// The lib expects: workflow_cid (32) + workflow_name (10) + workflow_owner (20) + report_name (2)
    function _buildMetadata(address _workflowOwner) internal pure returns (bytes memory) {
        return abi.encodePacked(
            bytes32(0), // workflow_cid (32 bytes)
            bytes10(0), // workflow_name (10 bytes)
            _workflowOwner, // workflow_owner (20 bytes)
            bytes2(0) // report_name (2 bytes)
        );
    }
}
