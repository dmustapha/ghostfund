// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {GhostFundVault} from "../src/GhostFundVault.sol";

contract ConfigureVaultAccess is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address vaultAddress = vm.envAddress("GHOSTFUND_VAULT_ADDRESS");
        address keystoneForwarder = vm.envAddress("KEYSTONE_FORWARDER");

        address workflowOwner;
        try vm.envAddress("WORKFLOW_OWNER") returns (address configuredOwner) {
            workflowOwner = configuredOwner;
        } catch {
            workflowOwner = vm.addr(deployerPrivateKey);
        }

        vm.startBroadcast(deployerPrivateKey);

        GhostFundVault vault = GhostFundVault(vaultAddress);
        vault.setKeystoneForwarder(keystoneForwarder, true);
        vault.setWorkflowOwner(workflowOwner, true);

        vm.stopBroadcast();

        console.log("Configured vault:", vaultAddress);
        console.log("Keystone forwarder allowed:", keystoneForwarder);
        console.log("Workflow owner allowed:", workflowOwner);
    }
}
