// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPool, DataTypes} from "./IPool.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockPool is IPool {
    uint128 public mockLiquidityRate;

    constructor(uint128 _rate) {
        mockLiquidityRate = _rate;
    }

    function setMockRate(uint128 _rate) external {
        mockLiquidityRate = _rate;
    }

    function getReserveData(address) external view override returns (DataTypes.ReserveDataLegacy memory data) {
        data.currentLiquidityRate = mockLiquidityRate;
        data.aTokenAddress = address(0); // No aToken in mock
    }

    function supply(address asset, uint256 amount, address, uint16) external override {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
    }

    function withdraw(address asset, uint256 amount, address to) external override returns (uint256) {
        require(IERC20(asset).balanceOf(address(this)) >= amount, "MockPool: insufficient liquidity");
        IERC20(asset).transfer(to, amount);
        return amount;
    }
}

contract MockAToken is ERC20 {
    constructor() ERC20("Mock aToken", "aToken") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}

contract MockPoolWithAToken is IPool {
    uint128 public mockLiquidityRate;
    MockAToken public aToken;

    constructor(uint128 _rate) {
        mockLiquidityRate = _rate;
        aToken = new MockAToken();
    }

    function getReserveData(address) external view override returns (DataTypes.ReserveDataLegacy memory data) {
        data.currentLiquidityRate = mockLiquidityRate;
        data.aTokenAddress = address(aToken);
    }

    function supply(address asset, uint256 amount, address onBehalfOf, uint16) external override {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        aToken.mint(onBehalfOf, amount);
    }

    function withdraw(address asset, uint256 amount, address to) external override returns (uint256) {
        require(IERC20(asset).balanceOf(address(this)) >= amount, "MockPool: insufficient liquidity");
        IERC20(asset).transfer(to, amount);
        aToken.burn(msg.sender, amount);
        return amount;
    }
}
