// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IExtractor} from "@chainlink/policy-management/interfaces/IExtractor.sol";
import {IPolicyEngine} from "@chainlink/policy-management/interfaces/IPolicyEngine.sol";

/// @title DepositExtractor
/// @notice Extracts parameters from checkDepositAllowed(address,address,uint256) calls.
contract DepositExtractor is IExtractor {
    string public constant override typeAndVersion = "DepositExtractor 1.0.0";

    function extract(IPolicyEngine.Payload calldata payload)
        external
        pure
        override
        returns (IPolicyEngine.Parameter[] memory)
    {
        (address depositor, address token, uint256 amount) =
            abi.decode(payload.data, (address, address, uint256));

        IPolicyEngine.Parameter[] memory result = new IPolicyEngine.Parameter[](3);
        result[0] = IPolicyEngine.Parameter(bytes32("depositor"), abi.encode(depositor));
        result[1] = IPolicyEngine.Parameter(bytes32("token"), abi.encode(token));
        result[2] = IPolicyEngine.Parameter(bytes32("amount"), abi.encode(amount));

        return result;
    }
}
