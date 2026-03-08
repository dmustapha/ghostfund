// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {GhostFundVault} from "../src/GhostFundVault.sol";
import {GhostToken} from "../src/GhostToken.sol";
import {MockPool} from "../src/MockPool.sol";

contract VaultHandler is Test {
    GhostFundVault public vault;
    GhostToken public token;
    address public forwarder;
    address public workflowOwner;
    address public owner;

    uint256 public forwarderReportCount;
    mapping(uint256 => bool) public executedIds;

    constructor(GhostFundVault _vault, GhostToken _token, address _forwarder, address _workflowOwner, address _owner) {
        vault = _vault;
        token = _token;
        forwarder = _forwarder;
        workflowOwner = _workflowOwner;
        owner = _owner;
    }

    function _buildMetadata(address _wo) internal pure returns (bytes memory) {
        return abi.encodePacked(bytes32(0), bytes10(0), _wo, bytes2(0));
    }

    function deposit(uint256 amount) external {
        amount = bound(amount, 1, 1_000_000 ether);

        // Mint tokens to owner and deposit
        vm.startPrank(owner);
        token.transfer(address(vault), amount);
        vm.stopPrank();
    }

    function withdraw(uint256 amount) external {
        uint256 bal = token.balanceOf(address(vault));
        if (bal == 0) return;
        amount = bound(amount, 1, bal);

        vm.prank(owner);
        vault.withdraw(address(token), amount);
    }

    function createReport(uint8 action, uint256 amount) external {
        action = uint8(bound(action, 1, 2));
        amount = bound(amount, 1, 1_000_000 ether);

        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(action, address(token), amount, uint256(500));

        vm.prank(forwarder);
        vault.onReport(metadata, report);
        forwarderReportCount++;
    }

    function approveReport(uint256 recId) external {
        uint256 count = vault.recommendationCount();
        if (count == 0) return;
        recId = bound(recId, 0, count - 1);

        GhostFundVault.Recommendation memory rec = vault.getRecommendation(recId);
        if (rec.executed) return;
        if (block.timestamp > rec.timestamp + 1 hours) return;

        // Ensure vault has funds for deposit actions
        if (rec.action == GhostFundVault.Action.DEPOSIT_TO_POOL) {
            uint256 bal = token.balanceOf(address(vault));
            if (bal < rec.amount) return;
        }

        // Ensure pool has funds for withdraw actions
        if (rec.action == GhostFundVault.Action.WITHDRAW_FROM_POOL) {
            uint256 poolBal = token.balanceOf(address(vault.aavePool()));
            if (poolBal < rec.amount) return;
        }

        vm.prank(owner);
        vault.userApprove(recId);
        executedIds[recId] = true;
    }
}

contract GhostFundVaultInvariantTest is Test {
    GhostFundVault vault;
    GhostToken token;
    MockPool pool;
    VaultHandler handler;

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

        // Fund owner with tokens
        // (this contract is owner and already has all tokens from GhostToken constructor)

        handler = new VaultHandler(vault, token, forwarder, workflowOwner, owner);

        // Give handler enough tokens to work with
        token.transfer(address(handler), type(uint128).max);

        targetContract(address(handler));
    }

    function invariant_vaultBalanceConsistent() public view {
        // Token balance should match what getVaultBalance reports
        uint256 reported = vault.getVaultBalance(address(token));
        uint256 actual = token.balanceOf(address(vault));
        assertEq(reported, actual, "getVaultBalance must match actual balance");
    }

    function invariant_executedRecommendationsStayExecuted() public view {
        uint256 count = vault.recommendationCount();
        for (uint256 i = 0; i < count; i++) {
            if (handler.executedIds(i)) {
                GhostFundVault.Recommendation memory rec = vault.getRecommendation(i);
                assertTrue(rec.executed, "Handler-tracked executed rec must stay executed on-chain");
            }
        }
    }

    function invariant_recommendationCountMonotonicallyIncreases() public view {
        // Count should equal the handler's tracked report count
        assertEq(vault.recommendationCount(), handler.forwarderReportCount(), "Count must equal reports created");
    }

}
