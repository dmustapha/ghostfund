// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {GhostFundVault} from "../src/GhostFundVault.sol";
import {GhostToken} from "../src/GhostToken.sol";
import {MockPool, MockPoolWithAToken} from "../src/MockPool.sol";
import {IReceiver} from "@chainlink/contracts/src/v0.8/keystone/interfaces/IReceiver.sol";

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

    function test_onReport_revertsIfInvalidAction() public {
        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(uint8(3), address(token), uint256(1000), uint256(500));

        vm.prank(forwarder);
        vm.expectRevert(abi.encodeWithSelector(GhostFundVault.InvalidAction.selector, uint8(3)));
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
        vm.expectRevert(bytes("Only callable by owner"));
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

    function test_getAavePosition_returnsATokenBalance() public {
        // Deploy a vault with aToken-aware mock pool
        MockPoolWithAToken poolWithAToken = new MockPoolWithAToken(50000000000000000000000000);

        address[] memory fwds = new address[](1);
        fwds[0] = forwarder;
        address[] memory wos = new address[](1);
        wos[0] = workflowOwner;

        GhostFundVault v = new GhostFundVault(fwds, wos, address(poolWithAToken));
        token.transfer(address(v), 50_000 ether);

        // Deposit to pool
        vm.prank(address(this)); // this is the owner since we deployed v
        v.depositToPool(address(token), 10_000 ether);

        // Check position
        (uint256 apy, uint256 balance) = v.getAavePosition(address(token));
        assertEq(apy, 50000000000000000000000000);
        assertEq(balance, 10_000 ether);
    }

    function test_getAavePosition_handlesMockWithoutAToken() public view {
        (uint256 apy, uint256 balance) = vault.getAavePosition(address(token));
        assertEq(apy, uint256(50000000000000000000000000));
        assertEq(balance, 0);
    }

    function test_getLatestRecommendation_revertsIfEmpty() public {
        vm.expectRevert(GhostFundVault.RecommendationNotFound.selector);
        vault.getLatestRecommendation();
    }

    // ═══════════════════════════════════════════
    // Additional coverage
    // ═══════════════════════════════════════════

    function test_userApprove_executesWithdraw() public {
        // First deposit so pool has tokens
        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory depositReport = abi.encode(
            uint8(1), address(token), uint256(50_000 ether), uint256(500)
        );
        vm.prank(forwarder);
        vault.onReport(metadata, depositReport);
        vault.userApprove(0);

        // Now send a WITHDRAW_FROM_POOL recommendation
        bytes memory withdrawReport = abi.encode(
            uint8(2), address(token), uint256(50_000 ether), uint256(500)
        );
        vm.prank(forwarder);
        vault.onReport(metadata, withdrawReport);
        vault.userApprove(1);

        GhostFundVault.Recommendation memory rec = vault.getRecommendation(1);
        assertTrue(rec.executed);
        assertEq(uint8(rec.action), 2); // WITHDRAW_FROM_POOL
    }

    function test_onReport_revertsZeroAmount() public {
        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(uint8(1), address(token), uint256(0), uint256(500));
        vm.prank(forwarder);
        vm.expectRevert(GhostFundVault.ZeroAmount.selector);
        vault.onReport(metadata, report);
    }

    function test_onReport_revertsOnActionNone() public {
        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(uint8(0), address(token), uint256(1000), uint256(500));

        vm.prank(forwarder);
        vm.expectRevert(abi.encodeWithSelector(GhostFundVault.InvalidAction.selector, uint8(0)));
        vault.onReport(metadata, report);
    }

    function test_depositToPool_revertsIfInsufficientBalance() public {
        // Vault has 100_000 ether, try to deposit more
        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(
            uint8(1), address(token), uint256(200_000 ether), uint256(500)
        );
        vm.prank(forwarder);
        vault.onReport(metadata, report);

        vm.expectRevert(GhostFundVault.InsufficientBalance.selector);
        vault.userApprove(0);
    }

    function test_onReport_multipleRecommendations() public {
        bytes memory metadata = _buildMetadata(workflowOwner);

        bytes memory report1 = abi.encode(uint8(1), address(token), uint256(10_000 ether), uint256(500));
        vm.prank(forwarder);
        vault.onReport(metadata, report1);

        bytes memory report2 = abi.encode(uint8(2), address(token), uint256(5_000 ether), uint256(300));
        vm.prank(forwarder);
        vault.onReport(metadata, report2);

        assertEq(vault.recommendationCount(), 2);

        GhostFundVault.Recommendation memory rec0 = vault.getRecommendation(0);
        assertEq(uint8(rec0.action), 1);
        assertEq(rec0.amount, 10_000 ether);

        GhostFundVault.Recommendation memory rec1 = vault.getRecommendation(1);
        assertEq(uint8(rec1.action), 2);
        assertEq(rec1.amount, 5_000 ether);
    }

    // ═══════════════════════════════════════════
    // Admin function tests
    // ═══════════════════════════════════════════

    function test_setKeystoneForwarder_addsForwarder() public {
        address newForwarder = address(0xF1);
        vault.setKeystoneForwarder(newForwarder, true);

        // Verify new forwarder can call onReport
        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(uint8(1), address(token), uint256(1000), uint256(500));
        vm.prank(newForwarder);
        vault.onReport(metadata, report);
        assertEq(vault.recommendationCount(), 1);
    }

    function test_setKeystoneForwarder_removesForwarder() public {
        vault.setKeystoneForwarder(forwarder, false);

        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(uint8(1), address(token), uint256(1000), uint256(500));
        vm.prank(forwarder);
        vm.expectRevert(GhostFundVault.MustBeKeystoneForwarder.selector);
        vault.onReport(metadata, report);
    }

    function test_setKeystoneForwarder_revertsIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert(bytes("Only callable by owner"));
        vault.setKeystoneForwarder(address(0xF2), true);
    }

    function test_setWorkflowOwner_addsOwner() public {
        address newWO = address(0xB1);
        vault.setWorkflowOwner(newWO, true);

        bytes memory metadata = _buildMetadata(newWO);
        bytes memory report = abi.encode(uint8(1), address(token), uint256(1000), uint256(500));
        vm.prank(forwarder);
        vault.onReport(metadata, report);
        assertEq(vault.recommendationCount(), 1);
    }

    function test_setWorkflowOwner_removesOwner() public {
        vault.setWorkflowOwner(workflowOwner, false);

        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(uint8(1), address(token), uint256(1000), uint256(500));
        vm.prank(forwarder);
        vm.expectRevert(abi.encodeWithSelector(GhostFundVault.UnauthorizedWorkflowOwner.selector, workflowOwner));
        vault.onReport(metadata, report);
    }

    function test_setWorkflowOwner_revertsIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert(bytes("Only callable by owner"));
        vault.setWorkflowOwner(address(0xB2), true);
    }

    // ═══════════════════════════════════════════
    // Event emission tests
    // ═══════════════════════════════════════════

    function test_onReport_emitsRecommendationReceived() public {
        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(uint8(1), address(token), uint256(50_000 ether), uint256(500));

        vm.expectEmit(true, true, false, true);
        emit GhostFundVault.RecommendationReceived(0, GhostFundVault.Action.DEPOSIT_TO_POOL, address(token), 50_000 ether, 500);

        vm.prank(forwarder);
        vault.onReport(metadata, report);
    }

    function test_userApprove_emitsStrategyExecuted() public {
        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(uint8(1), address(token), uint256(50_000 ether), uint256(500));
        vm.prank(forwarder);
        vault.onReport(metadata, report);

        vm.expectEmit(true, true, false, true);
        emit GhostFundVault.StrategyExecuted(0, GhostFundVault.Action.DEPOSIT_TO_POOL, address(token), 50_000 ether);

        vault.userApprove(0);
    }

    function test_depositToPool_emitsDeposited() public {
        vm.expectEmit(true, false, false, true);
        emit GhostFundVault.Deposited(address(token), 10_000 ether);

        vault.depositToPool(address(token), 10_000 ether);
    }

    function test_withdrawFromPool_emitsWithdrawn() public {
        vault.depositToPool(address(token), 10_000 ether);

        vm.expectEmit(true, true, false, true);
        emit GhostFundVault.Withdrawn(address(token), owner, 10_000 ether);

        vault.withdrawFromPool(address(token), 10_000 ether);
    }

    function test_withdraw_emitsWithdrawn() public {
        vm.expectEmit(true, true, false, true);
        emit GhostFundVault.Withdrawn(address(token), owner, 10_000 ether);

        vault.withdraw(address(token), 10_000 ether);
    }

    function test_setKeystoneForwarder_emitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit GhostFundVault.KeystoneForwarderSet(address(0xF2), true);

        vault.setKeystoneForwarder(address(0xF2), true);
    }

    function test_setWorkflowOwner_emitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit GhostFundVault.WorkflowOwnerSet(address(0xB2), true);

        vault.setWorkflowOwner(address(0xB2), true);
    }

    // ═══════════════════════════════════════════
    // Edge case tests
    // ═══════════════════════════════════════════

    function test_supportsInterface_returnsTrue() public view {
        assertTrue(vault.supportsInterface(type(IReceiver).interfaceId));
    }

    function test_supportsInterface_returnsFalse() public view {
        assertFalse(vault.supportsInterface(bytes4(0xdeadbeef)));
    }

    function test_withdraw_revertsIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert(bytes("Only callable by owner"));
        vault.withdraw(address(token), 1000);
    }

    function test_deposit_revertsIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert(bytes("Only callable by owner"));
        vault.deposit(address(token), 1000);
    }

    function test_depositToPool_revertsIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert(bytes("Only callable by owner"));
        vault.depositToPool(address(token), 1000);
    }

    function test_withdrawFromPool_revertsIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert(bytes("Only callable by owner"));
        vault.withdrawFromPool(address(token), 1000);
    }

    function test_onReport_revertsIfUnauthorizedWorkflowOwner() public {
        address badOwner = address(0xBB);
        bytes memory metadata = _buildMetadata(badOwner);
        bytes memory report = abi.encode(uint8(1), address(token), uint256(1000), uint256(500));

        vm.prank(forwarder);
        vm.expectRevert(abi.encodeWithSelector(GhostFundVault.UnauthorizedWorkflowOwner.selector, badOwner));
        vault.onReport(metadata, report);
    }

    function test_getRecommendation_returnsEmptyForNonexistent() public view {
        GhostFundVault.Recommendation memory rec = vault.getRecommendation(999);
        assertEq(uint8(rec.action), 0); // Action.NONE
        assertEq(rec.asset, address(0));
        assertEq(rec.amount, 0);
        assertEq(rec.apy, 0);
        assertEq(rec.timestamp, 0);
        assertFalse(rec.executed);
    }

    function test_userApprove_revertsIfRecommendationNotFound() public {
        vm.expectRevert(GhostFundVault.RecommendationNotFound.selector);
        vault.userApprove(999);
    }

    function test_userApprove_atExactExpiry() public {
        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(uint8(1), address(token), uint256(50_000 ether), uint256(500));
        vm.prank(forwarder);
        vault.onReport(metadata, report);

        // Warp to exactly 1 hour + 1 second past timestamp — should revert
        vm.warp(block.timestamp + 1 hours + 1);
        vm.expectRevert(GhostFundVault.RecommendationExpired.selector);
        vault.userApprove(0);
    }

    function test_userApprove_justBeforeExpiry() public {
        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(uint8(1), address(token), uint256(50_000 ether), uint256(500));
        vm.prank(forwarder);
        vault.onReport(metadata, report);

        // Warp to exactly 1 hour — should succeed (block.timestamp == rec.timestamp + 1 hours)
        vm.warp(block.timestamp + 1 hours);
        vault.userApprove(0);

        GhostFundVault.Recommendation memory rec = vault.getRecommendation(0);
        assertTrue(rec.executed);
    }

    // ═══════════════════════════════════════════
    // Constructor tests
    // ═══════════════════════════════════════════

    function test_constructor_revertsZeroPool() public {
        address[] memory fwds = new address[](1);
        fwds[0] = forwarder;
        address[] memory owners = new address[](1);
        owners[0] = workflowOwner;
        vm.expectRevert("Zero pool address");
        new GhostFundVault(fwds, owners, address(0));
    }

    function test_constructor_setsPool() public view {
        assertEq(address(vault.aavePool()), address(pool));
    }

    function test_constructor_setsMultipleForwarders() public {
        address[] memory fwds = new address[](3);
        fwds[0] = address(0xF1);
        fwds[1] = address(0xF2);
        fwds[2] = address(0xF3);
        address[] memory wos = new address[](1);
        wos[0] = workflowOwner;

        GhostFundVault v = new GhostFundVault(fwds, wos, address(pool));

        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(uint8(1), address(token), uint256(1000), uint256(500));

        for (uint256 i = 0; i < fwds.length; i++) {
            vm.prank(fwds[i]);
            v.onReport(metadata, report);
        }
        assertEq(v.recommendationCount(), 3);
    }

    function test_constructor_setsMultipleWorkflowOwners() public {
        address[] memory fwds = new address[](1);
        fwds[0] = forwarder;
        address[] memory wos = new address[](3);
        wos[0] = address(0xB1);
        wos[1] = address(0xB2);
        wos[2] = address(0xB3);

        GhostFundVault v = new GhostFundVault(fwds, wos, address(pool));

        bytes memory report = abi.encode(uint8(1), address(token), uint256(1000), uint256(500));
        for (uint256 i = 0; i < wos.length; i++) {
            bytes memory metadata = _buildMetadata(wos[i]);
            vm.prank(forwarder);
            v.onReport(metadata, report);
        }
        assertEq(v.recommendationCount(), 3);
    }

    function test_constructor_emptyArrays() public {
        address[] memory empty = new address[](0);
        GhostFundVault v = new GhostFundVault(empty, empty, address(pool));

        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(uint8(1), address(token), uint256(1000), uint256(500));

        // Any caller should fail as no forwarder is registered
        vm.prank(forwarder);
        vm.expectRevert(GhostFundVault.MustBeKeystoneForwarder.selector);
        v.onReport(metadata, report);
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
