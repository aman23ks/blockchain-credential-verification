// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../access/RegistryAccessControl.sol";

/// @dev Test-only contract that exposes the RegistryAccessControl constructor
///      so the zero-address owner check can be unit tested. Not deployed in production.
contract RegistryAccessControlMock is RegistryAccessControl {
    constructor(address initialOwner) RegistryAccessControl(initialOwner) {}
}
