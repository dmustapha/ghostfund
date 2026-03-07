// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {GhostFundVault} from "../src/GhostFundVault.sol";
import {GhostToken} from "../src/GhostToken.sol";

contract DeployGhostFund is Script {
    // Aave V3 Sepolia
    address constant AAVE_POOL = 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // ⚠️ HACKATHON NOTE: KEYSTONE_FORWARDER is set to the deployer EOA for CRE
        // simulation compatibility. In production, replace with the actual Keystone
        // Forwarder contract address from CRE deployment output. Until then, any
        // transaction from this EOA will pass the onReport() access check.
        address keystoneForwarder = vm.envAddress("KEYSTONE_FORWARDER");
        address workflowOwner = vm.envOr("WORKFLOW_OWNER", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy GhostToken (1M supply)
        GhostToken ghostToken = new GhostToken(1_000_000 ether);
        console.log("GhostToken deployed:", address(ghostToken));

        // 2. Deploy GhostFundVault
        address[] memory forwarders = new address[](1);
        forwarders[0] = keystoneForwarder;

        address[] memory owners = new address[](1);
        owners[0] = workflowOwner;

        GhostFundVault vault = new GhostFundVault(forwarders, owners, AAVE_POOL);
        console.log("GhostFundVault deployed:", address(vault));

        // 3. Transfer some tokens to vault for demo
        ghostToken.transfer(address(vault), 100_000 ether);
        console.log("Transferred 100K GHOST to vault");

        vm.stopBroadcast();
    }
}
