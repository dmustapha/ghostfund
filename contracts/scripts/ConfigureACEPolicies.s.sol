// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {IPolicyEngine} from "@chainlink/policy-management/interfaces/IPolicyEngine.sol";
import {MaxPolicy} from "@chainlink/policy-management/policies/MaxPolicy.sol";
import {PausePolicy} from "@chainlink/policy-management/policies/PausePolicy.sol";

contract ConfigureACEPolicies is Script {
    function _contains(address[] memory arr, address target) internal pure returns (bool) {
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] == target) return true;
        }
        return false;
    }

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        address policyEngineAddress = vm.envAddress("POLICY_ENGINE_ADDRESS");
        address allowPolicyAddress = vm.envAddress("ALLOW_POLICY_ADDRESS");
        address maxPolicyAddress = vm.envAddress("MAX_POLICY_ADDRESS");
        address pausePolicyAddress = vm.envAddress("PAUSE_POLICY_ADDRESS");
        address target = vm.envAddress("PT_VAULT_ADDRESS");

        uint256 maxDepositAmount = vm.envOr("MAX_DEPOSIT_AMOUNT", uint256(1_000_000 ether));

        IPolicyEngine policyEngine = IPolicyEngine(policyEngineAddress);
        bytes4 selector = bytes4(keccak256("checkDepositAllowed(address,address,uint256)"));

        bytes32[] memory allowParams = new bytes32[](1);
        allowParams[0] = bytes32("depositor");

        bytes32[] memory maxParams = new bytes32[](1);
        maxParams[0] = bytes32("amount");

        vm.startBroadcast(deployerPrivateKey);

        address[] memory existing = policyEngine.getPolicies(target, selector);

        if (!_contains(existing, allowPolicyAddress)) {
            policyEngine.addPolicy(target, selector, allowPolicyAddress, allowParams);
            console.log("Added AllowPolicy");
        } else {
            console.log("AllowPolicy already attached");
        }

        if (!_contains(existing, maxPolicyAddress)) {
            policyEngine.addPolicy(target, selector, maxPolicyAddress, maxParams);
            console.log("Added MaxPolicy");
        } else {
            console.log("MaxPolicy already attached");
        }

        if (!_contains(existing, pausePolicyAddress)) {
            policyEngine.addPolicy(target, selector, pausePolicyAddress, new bytes32[](0));
            console.log("Added PausePolicy");
        } else {
            console.log("PausePolicy already attached");
        }

        MaxPolicy(maxPolicyAddress).setMax(maxDepositAmount);
        if (PausePolicy(pausePolicyAddress).s_paused()) {
            PausePolicy(pausePolicyAddress).setPausedState(false);
            console.log("Configured PausePolicy paused=false");
        } else {
            console.log("PausePolicy already paused=false");
        }

        console.log("Configured MaxPolicy max:", maxDepositAmount);

        vm.stopBroadcast();
    }
}
