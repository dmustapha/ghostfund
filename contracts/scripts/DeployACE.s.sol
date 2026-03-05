// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {PolicyEngine} from "@chainlink/policy-management/core/PolicyEngine.sol";
import {AllowPolicy} from "@chainlink/policy-management/policies/AllowPolicy.sol";

contract DeployACE is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // 1) Deploy PolicyEngine (proxy)
        PolicyEngine peImpl = new PolicyEngine();
        bytes memory peInitData = abi.encodeWithSelector(
            PolicyEngine.initialize.selector,
            true,
            deployer
        );
        ERC1967Proxy peProxy = new ERC1967Proxy(address(peImpl), peInitData);
        console.log("PolicyEngine:", address(peProxy));

        // 2) Deploy AllowPolicy (proxy)
        AllowPolicy allowImpl = new AllowPolicy();
        bytes memory allowInitData = abi.encodeWithSignature(
            "initialize(address,address,bytes)",
            address(peProxy),
            deployer,
            bytes("")
        );
        ERC1967Proxy allowProxy = new ERC1967Proxy(address(allowImpl), allowInitData);
        console.log("AllowPolicy:", address(allowProxy));

        vm.stopBroadcast();
    }
}
