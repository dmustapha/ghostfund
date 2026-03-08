// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {IPolicyEngine} from "@chainlink/policy-management/interfaces/IPolicyEngine.sol";
import {DepositExtractor} from "../src/DepositExtractor.sol";

contract DepositExtractorTest is Test {
    DepositExtractor extractor;

    address depositor = address(0xA1);
    address token = address(0xA2);
    uint256 amount = 1_000 ether;

    function setUp() public {
        extractor = new DepositExtractor();
    }

    // ═══════════════════════════════════════════
    // extract tests
    // ═══════════════════════════════════════════

    function test_extract_returnsThreeParameters() public view {
        IPolicyEngine.Payload memory payload = _buildPayload(depositor, token, amount);

        IPolicyEngine.Parameter[] memory params = extractor.extract(payload);
        assertEq(params.length, 3);
    }

    function test_extract_correctParameterNames() public view {
        IPolicyEngine.Payload memory payload = _buildPayload(depositor, token, amount);

        IPolicyEngine.Parameter[] memory params = extractor.extract(payload);
        assertEq(params[0].name, bytes32("depositor"));
        assertEq(params[1].name, bytes32("token"));
        assertEq(params[2].name, bytes32("amount"));
    }

    function test_extract_correctParameterValues() public view {
        IPolicyEngine.Payload memory payload = _buildPayload(depositor, token, amount);

        IPolicyEngine.Parameter[] memory params = extractor.extract(payload);
        assertEq(abi.decode(params[0].value, (address)), depositor);
        assertEq(abi.decode(params[1].value, (address)), token);
        assertEq(abi.decode(params[2].value, (uint256)), amount);
    }

    // ═══════════════════════════════════════════
    // typeAndVersion test
    // ═══════════════════════════════════════════

    function test_typeAndVersion() public view {
        assertEq(extractor.typeAndVersion(), "DepositExtractor 1.0.0");
    }

    // ═══════════════════════════════════════════
    // Fuzz tests
    // ═══════════════════════════════════════════

    function testFuzz_extract_anyValues(address _depositor, address _token, uint256 _amount) public view {
        IPolicyEngine.Payload memory payload = _buildPayload(_depositor, _token, _amount);

        IPolicyEngine.Parameter[] memory params = extractor.extract(payload);
        assertEq(abi.decode(params[0].value, (address)), _depositor);
        assertEq(abi.decode(params[1].value, (address)), _token);
        assertEq(abi.decode(params[2].value, (uint256)), _amount);
    }

    // ═══════════════════════════════════════════
    // Helpers
    // ═══════════════════════════════════════════

    function _buildPayload(address _depositor, address _token, uint256 _amount)
        internal
        pure
        returns (IPolicyEngine.Payload memory)
    {
        return IPolicyEngine.Payload({
            selector: bytes4(keccak256("checkDepositAllowed(address,address,uint256)")),
            sender: address(0xA1),
            data: abi.encode(_depositor, _token, _amount),
            context: ""
        });
    }
}
