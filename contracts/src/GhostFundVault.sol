// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPool, DataTypes} from "./IPool.sol";
import {IReceiver} from "@chainlink/contracts/src/v0.8/keystone/interfaces/IReceiver.sol";
import {KeystoneFeedDefaultMetadataLib} from "@chainlink/contracts/src/v0.8/keystone/lib/KeystoneFeedDefaultMetadataLib.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {OwnerIsCreator} from "@chainlink/contracts/src/v0.8/shared/access/OwnerIsCreator.sol";

contract GhostFundVault is IReceiver, OwnerIsCreator {
    using KeystoneFeedDefaultMetadataLib for bytes;
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════
    // TYPES
    // ═══════════════════════════════════════════════════

    enum Action { NONE, DEPOSIT_TO_POOL, WITHDRAW_FROM_POOL }

    struct Recommendation {
        Action action;
        address asset;
        uint256 amount;
        uint256 apy;
        uint256 timestamp;
        bool executed;
    }

    // ═══════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════

    IPool public immutable aavePool;

    mapping(address => bool) public allowedKeystoneForwarders;
    mapping(address => bool) public allowedWorkflowOwners;

    uint256 public recommendationCount;
    mapping(uint256 => Recommendation) public recommendations;

    // ═══════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════

    event RecommendationReceived(
        uint256 indexed recId, Action action, address indexed asset, uint256 amount, uint256 apy
    );
    event StrategyExecuted(
        uint256 indexed recId, Action action, address indexed asset, uint256 amount
    );
    event Deposited(address indexed asset, uint256 amount);
    event Withdrawn(address indexed asset, address indexed to, uint256 amount);
    event KeystoneForwarderSet(address indexed forwarder);
    event WorkflowOwnerSet(address indexed owner);

    // ═══════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════

    error MustBeKeystoneForwarder();
    error UnauthorizedWorkflowOwner(address owner);
    error InvalidAction(uint8 action);
    error RecommendationNotFound();
    error RecommendationAlreadyExecuted();
    error RecommendationExpired();
    error InsufficientBalance();

    // ═══════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════

    constructor(
        address[] memory _keystoneForwarders,
        address[] memory _workflowOwners,
        address _aavePool
    ) {
        aavePool = IPool(_aavePool);
        for (uint256 i = 0; i < _keystoneForwarders.length; i++) {
            allowedKeystoneForwarders[_keystoneForwarders[i]] = true;
        }
        for (uint256 i = 0; i < _workflowOwners.length; i++) {
            allowedWorkflowOwners[_workflowOwners[i]] = true;
        }
    }

    // ═══════════════════════════════════════════════════
    // CRE REPORT HANDLER
    // ═══════════════════════════════════════════════════

    function onReport(bytes calldata metadata, bytes calldata report) external override {
        if (!allowedKeystoneForwarders[msg.sender]) revert MustBeKeystoneForwarder();

        (, address workflowOwner,) = metadata._extractMetadataInfo();
        if (!allowedWorkflowOwners[workflowOwner]) revert UnauthorizedWorkflowOwner(workflowOwner);

        (uint8 action, address asset, uint256 amount, uint256 apy) =
            abi.decode(report, (uint8, address, uint256, uint256));
        if (action == uint8(Action.NONE) || action > uint8(Action.WITHDRAW_FROM_POOL)) {
            revert InvalidAction(action);
        }

        uint256 recId = recommendationCount++;
        recommendations[recId] = Recommendation({
            action: Action(action),
            asset: asset,
            amount: amount,
            apy: apy,
            timestamp: block.timestamp,
            executed: false
        });

        emit RecommendationReceived(recId, Action(action), asset, amount, apy);
    }

    // ═══════════════════════════════════════════════════
    // USER APPROVAL
    // ═══════════════════════════════════════════════════

    function userApprove(uint256 recId) external onlyOwner {
        Recommendation storage rec = recommendations[recId];
        if (rec.action == Action.NONE) revert RecommendationNotFound();
        if (rec.executed) revert RecommendationAlreadyExecuted();
        if (block.timestamp > rec.timestamp + 1 hours) revert RecommendationExpired();

        rec.executed = true;

        if (rec.action == Action.DEPOSIT_TO_POOL) {
            _depositToPool(rec.asset, rec.amount);
        } else if (rec.action == Action.WITHDRAW_FROM_POOL) {
            _withdrawFromPool(rec.asset, rec.amount, owner());
        }

        emit StrategyExecuted(recId, rec.action, rec.asset, rec.amount);
    }

    // ═══════════════════════════════════════════════════
    // POOL OPERATIONS
    // ═══════════════════════════════════════════════════

    function _depositToPool(address asset, uint256 amount) internal {
        IERC20(asset).approve(address(aavePool), amount);
        aavePool.supply(asset, amount, address(this), 0);
        emit Deposited(asset, amount);
    }

    function _withdrawFromPool(address asset, uint256 amount, address to) internal {
        aavePool.withdraw(asset, amount, to);
        emit Withdrawn(asset, to, amount);
    }

    // ═══════════════════════════════════════════════════
    // OWNER FUNCTIONS
    // ═══════════════════════════════════════════════════

    function deposit(address asset, uint256 amount) external onlyOwner {
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
    }

    function withdraw(address asset, uint256 amount) external onlyOwner {
        IERC20(asset).safeTransfer(msg.sender, amount);
        emit Withdrawn(asset, msg.sender, amount);
    }

    function depositToPool(address asset, uint256 amount) external onlyOwner {
        _depositToPool(asset, amount);
    }

    function withdrawFromPool(address asset, uint256 amount) external onlyOwner {
        _withdrawFromPool(asset, amount, msg.sender);
    }

    function setKeystoneForwarder(address f, bool allowed) external onlyOwner {
        allowedKeystoneForwarders[f] = allowed;
        emit KeystoneForwarderSet(f);
    }

    function setWorkflowOwner(address o, bool allowed) external onlyOwner {
        allowedWorkflowOwners[o] = allowed;
        emit WorkflowOwnerSet(o);
    }

    // ═══════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════

    function getRecommendation(uint256 recId) external view returns (Recommendation memory) {
        return recommendations[recId];
    }

    function getLatestRecommendation() external view returns (uint256 recId, Recommendation memory rec) {
        if (recommendationCount == 0) revert RecommendationNotFound();
        recId = recommendationCount - 1;
        rec = recommendations[recId];
    }

    function getVaultBalance(address asset) external view returns (uint256) {
        return IERC20(asset).balanceOf(address(this));
    }

    function getAavePosition(address asset) external view returns (uint256 apy, uint256 balance) {
        DataTypes.ReserveDataLegacy memory data = aavePool.getReserveData(asset);
        apy = uint256(data.currentLiquidityRate);
        if (data.aTokenAddress == address(0)) return (apy, 0);
        balance = IERC20(data.aTokenAddress).balanceOf(address(this));
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IReceiver).interfaceId;
    }
}
