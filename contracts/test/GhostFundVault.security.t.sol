// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {GhostFundVault} from "../src/GhostFundVault.sol";
import {GhostToken} from "../src/GhostToken.sol";
import {MockPool} from "../src/MockPool.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Malicious token that attempts reentrancy on transfer
contract ReentrantToken is ERC20 {
    address public target;
    bool public attacking;

    constructor() ERC20("Evil", "EVIL") {
        _mint(msg.sender, 1_000_000 ether);
    }

    function setTarget(address _target) external {
        target = _target;
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        if (target != address(0) && !attacking && to == target) {
            attacking = true;
            // Attempt reentrancy — try to call withdraw during transfer
            try GhostFundVault(payable(target)).withdraw(address(this), 1) {
                // If this succeeds, the reentrancy guard is broken
            } catch {
                // Expected — ReentrancyGuard should block this
            }
            attacking = false;
        }
        return super.transfer(to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        return super.transferFrom(from, to, amount);
    }
}

contract GhostFundVaultSecurityTest is Test {
    GhostFundVault vault;
    GhostToken token;
    MockPool pool;

    address owner = address(this);
    address forwarder = address(0xF0);
    address workflowOwner = address(0xB0);
    address alice = address(0xA1);
    address bob = address(0xA2);

    function setUp() public {
        pool = new MockPool(50000000000000000000000000);
        token = new GhostToken(1_000_000 ether);

        address[] memory forwarders = new address[](1);
        forwarders[0] = forwarder;
        address[] memory owners = new address[](1);
        owners[0] = workflowOwner;

        vault = new GhostFundVault(forwarders, owners, address(pool));
        token.transfer(address(vault), 100_000 ether);
    }

    function _buildMetadata(address _workflowOwner) internal pure returns (bytes memory) {
        return abi.encodePacked(bytes32(0), bytes10(0), _workflowOwner, bytes2(0));
    }

    // ═══════════════════════════════════════════
    // 1. Reentrancy test
    // ═══════════════════════════════════════════

    function test_security_reentrancyBlocked() public {
        ReentrantToken evil = new ReentrantToken();
        evil.setTarget(address(vault));

        // Fund vault with evil token
        evil.transfer(address(vault), 10_000 ether);

        // Withdraw should work but reentrancy callback should be blocked
        vault.withdraw(address(evil), 1_000 ether);

        // Vault balance should be exactly 9000 — no double withdraw
        assertEq(evil.balanceOf(address(vault)), 9_000 ether);
    }

    // ═══════════════════════════════════════════
    // 2. Access control exhaustive
    // ═══════════════════════════════════════════

    function test_security_allExternalFunctionsAccessControlled() public {
        // Test every onlyOwner function with alice (non-owner)
        vm.startPrank(alice);

        vm.expectRevert(bytes("Only callable by owner"));
        vault.deposit(address(token), 1);

        vm.expectRevert(bytes("Only callable by owner"));
        vault.withdraw(address(token), 1);

        vm.expectRevert(bytes("Only callable by owner"));
        vault.depositToPool(address(token), 1);

        vm.expectRevert(bytes("Only callable by owner"));
        vault.withdrawFromPool(address(token), 1);

        vm.expectRevert(bytes("Only callable by owner"));
        vault.userApprove(0);

        vm.expectRevert(bytes("Only callable by owner"));
        vault.setKeystoneForwarder(address(0), true);

        vm.expectRevert(bytes("Only callable by owner"));
        vault.setWorkflowOwner(address(0), true);

        vm.stopPrank();

        // Test onReport with non-forwarder
        vm.prank(alice);
        vm.expectRevert(GhostFundVault.MustBeKeystoneForwarder.selector);
        vault.onReport(_buildMetadata(workflowOwner), abi.encode(uint8(1), address(token), uint256(1), uint256(1)));

        // Test onReport with forwarder but invalid workflow owner
        vm.prank(forwarder);
        vm.expectRevert(abi.encodeWithSelector(GhostFundVault.UnauthorizedWorkflowOwner.selector, alice));
        vault.onReport(_buildMetadata(alice), abi.encode(uint8(1), address(token), uint256(1), uint256(1)));
    }

    // ═══════════════════════════════════════════
    // 3. Frontrunning / expiry test
    // ═══════════════════════════════════════════

    function test_security_expiryPreventsStaleApproval() public {
        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(uint8(1), address(token), uint256(50_000 ether), uint256(500));

        vm.prank(forwarder);
        vault.onReport(metadata, report);

        // Simulate delayed approval — 1 hour + 1 second
        vm.warp(block.timestamp + 1 hours + 1);

        vm.expectRevert(GhostFundVault.RecommendationExpired.selector);
        vault.userApprove(0);

        // Recommendation should NOT be executed
        GhostFundVault.Recommendation memory rec = vault.getRecommendation(0);
        assertFalse(rec.executed);
    }

    // ═══════════════════════════════════════════
    // 4. Zero address handling
    // ═══════════════════════════════════════════

    function test_security_zeroAddressPool() public {
        address[] memory fwds = new address[](1);
        fwds[0] = forwarder;
        address[] memory wos = new address[](1);
        wos[0] = workflowOwner;

        // Deploy with zero address pool should revert
        vm.expectRevert("Zero pool address");
        new GhostFundVault(fwds, wos, address(0));
    }

    // ═══════════════════════════════════════════
    // 5. Large value storage test
    // ═══════════════════════════════════════════

    function test_security_maxUint256Recommendation() public {
        bytes memory metadata = _buildMetadata(workflowOwner);
        bytes memory report = abi.encode(
            uint8(1),
            address(token),
            type(uint256).max,
            type(uint256).max
        );

        vm.prank(forwarder);
        vault.onReport(metadata, report);

        GhostFundVault.Recommendation memory rec = vault.getRecommendation(0);
        assertEq(rec.amount, type(uint256).max);
        assertEq(rec.apy, type(uint256).max);
        assertFalse(rec.executed);

        // Approval should revert because vault doesn't have max tokens
        vm.expectRevert(GhostFundVault.InsufficientBalance.selector);
        vault.userApprove(0);
    }
}
