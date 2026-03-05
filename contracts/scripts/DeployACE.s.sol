// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {PolicyEngine} from "@chainlink/policy-management/core/PolicyEngine.sol";
import {AllowPolicy} from "@chainlink/policy-management/policies/AllowPolicy.sol";
import {MaxPolicy} from "@chainlink/policy-management/policies/MaxPolicy.sol";
import {PausePolicy} from "@chainlink/policy-management/policies/PausePolicy.sol";

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

        // 3) Deploy MaxPolicy (proxy) with conservative max limit
        MaxPolicy maxImpl = new MaxPolicy();
        bytes memory maxInitData = abi.encodeWithSignature(
            "initialize(address,address,bytes)",
            address(peProxy),
            deployer,
            abi.encode(uint256(1_000_000 ether))
        );
        ERC1967Proxy maxProxy = new ERC1967Proxy(address(maxImpl), maxInitData);
        console.log("MaxPolicy:", address(maxProxy));

        // 4) Deploy PausePolicy (proxy) default unpaused
        PausePolicy pauseImpl = new PausePolicy();
        bytes memory pauseInitData = abi.encodeWithSignature(
            "initialize(address,address,bytes)",
            address(peProxy),
            deployer,
            abi.encode(false)
        );
        ERC1967Proxy pauseProxy = new ERC1967Proxy(address(pauseImpl), pauseInitData);
        console.log("PausePolicy:", address(pauseProxy));

        vm.stopBroadcast();
    }
}
