// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {GhostFundVault} from "../src/GhostFundVault.sol";
import {GhostToken} from "../src/GhostToken.sol";
import {MockPool} from "../src/MockPool.sol";

contract GhostFundVaultFuzzTest is Test {
    GhostFundVault vault;
    GhostToken token;
    MockPool pool;

    address owner = address(this);
    address forwarder = address(0xF0);
    address workflowOwner = address(0xB0);

    function setUp() public {
        pool = new MockPool(50000000000000000000000000);
        token = new GhostToken(type(uint256).max);

        address[] memory forwarders = new address[](1);
        forwarders[0] = forwarder;
        address[] memory owners = new address[](1);
        owners[0] = workflowOwner;

        vault = new GhostFundVault(forwarders, owners, address(pool));
    }

    function _buildMetadata(address _workflowOwner) internal pure returns (bytes memory) {
        return abi.encodePacked(bytes32(0), bytes10(0), _workflowOwner, bytes2(0));
    }

    function testFuzz_onReport_anyValidAction(uint8 action) public {
        action = uint8(bound(action, 1, 2));

        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(action, address(token), uint256(1000), uint256(500));

        vm.prank(forwarder);
        vault.onReport(metadata, report);

        GhostFundVault.Recommendation memory rec = vault.getRecommendation(0);
        assertEq(uint8(rec.action), action);
        assertEq(rec.asset, address(token));
        assertEq(rec.amount, 1000);
        assertEq(rec.apy, 500);
        assertFalse(rec.executed);
    }

    function testFuzz_onReport_anyAmount(uint256 amount) public {
        amount = bound(amount, 1, type(uint256).max);

        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(uint8(1), address(token), amount, uint256(500));

        vm.prank(forwarder);
        vault.onReport(metadata, report);

        GhostFundVault.Recommendation memory rec = vault.getRecommendation(0);
        assertEq(rec.amount, amount);
    }

    function testFuzz_deposit_anyAmount(uint256 amount) public {
        amount = bound(amount, 1, type(uint128).max);

        token.transfer(address(this), amount);
        token.approve(address(vault), amount);

        uint256 balBefore = token.balanceOf(address(vault));
        vault.deposit(address(token), amount);
        assertEq(token.balanceOf(address(vault)), balBefore + amount);
    }

    function testFuzz_userApprove_depositAnyAmount(uint256 amount) public {
        amount = bound(amount, 1, type(uint128).max);

        // Fund vault
        token.transfer(address(vault), amount);

        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(uint8(1), address(token), amount, uint256(500));
        vm.prank(forwarder);
        vault.onReport(metadata, report);

        vault.userApprove(0);

        GhostFundVault.Recommendation memory rec = vault.getRecommendation(0);
        assertTrue(rec.executed);
        // Tokens moved to pool
        assertEq(token.balanceOf(address(pool)), amount);
    }

    function testFuzz_userApprove_withdrawAnyAmount(uint256 amount) public {
        amount = bound(amount, 1, type(uint128).max);

        // Fund vault, deposit to pool first
        token.transfer(address(vault), amount);
        vault.depositToPool(address(token), amount);

        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(uint8(2), address(token), amount, uint256(500));
        vm.prank(forwarder);
        vault.onReport(metadata, report);

        vault.userApprove(0);

        GhostFundVault.Recommendation memory rec = vault.getRecommendation(0);
        assertTrue(rec.executed);
    }

    function testFuzz_expiry_boundary(uint256 warpTime) public {
        // Fund vault for potential deposit
        token.transfer(address(vault), 100_000 ether);

        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(uint8(1), address(token), uint256(1000), uint256(500));
        vm.prank(forwarder);
        vault.onReport(metadata, report);

        uint256 ts = block.timestamp;
        warpTime = bound(warpTime, 0, 3 hours);
        vm.warp(ts + warpTime);

        if (warpTime > 1 hours) {
            vm.expectRevert(GhostFundVault.RecommendationExpired.selector);
            vault.userApprove(0);
        } else {
            vault.userApprove(0);
            assertTrue(vault.getRecommendation(0).executed);
        }
    }

    function testFuzz_onReport_revertsOnInvalidAction(uint8 action) public {
        vm.assume(action == 0 || action > 2);

        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(action, address(token), uint256(1000), uint256(500));

        vm.prank(forwarder);
        vm.expectRevert(abi.encodeWithSelector(GhostFundVault.InvalidAction.selector, action));
        vault.onReport(metadata, report);
    }

    function testFuzz_multipleRecommendations(uint8 count) public {
        count = uint8(bound(count, 1, 10));

        bytes memory metadata = _buildMetadata(workflowOwner);

        for (uint8 i = 0; i < count; i++) {
            uint8 action = (i % 2 == 0) ? 1 : 2;
            bytes memory report = abi.encode(action, address(token), uint256(1000 + i), uint256(500));
            vm.prank(forwarder);
            vault.onReport(metadata, report);
        }

        assertEq(vault.recommendationCount(), count);

        for (uint256 i = 0; i < count; i++) {
            GhostFundVault.Recommendation memory rec = vault.getRecommendation(i);
            assertEq(rec.amount, 1000 + i);
            assertFalse(rec.executed);
        }
    }
}
