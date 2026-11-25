// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IRegistryAccessControl.sol";

/**
 * @title ICredentialRegistry
 * @notice Interface for the academic credential registry.
 * @dev Credential files and personal information remain off-chain. Only a
 *      SHA-256 credential hash and verification metadata are stored on-chain.
 */
interface ICredentialRegistry is IRegistryAccessControl {
    struct Credential {
        address issuer;
        uint256 issuedAt;
        bool revoked;
        bool exists;
    }

    // ---------- Events ----------
    event CredentialRegistered(bytes32 indexed credentialHash, address indexed issuer, uint256 issuedAt);
    event CredentialRevoked(bytes32 indexed credentialHash, address indexed issuer);

    // ---------- Errors ----------
    /// @notice The zero hash cannot identify a credential.
    error EmptyCredentialHash();
    /// @notice A credential with this hash is already registered.
    error CredentialAlreadyRegistered(bytes32 credentialHash);
    /// @notice No credential with this hash exists.
    error CredentialNotFound(bytes32 credentialHash);
    /// @notice Only the institution that registered the credential may revoke it.
    error NotOriginalIssuer(bytes32 credentialHash, address caller);
    /// @notice The credential has already been revoked.
    error CredentialAlreadyRevoked(bytes32 credentialHash);

    // ---------- Functions ----------
    function registerCredential(bytes32 credentialHash) external;
    function revokeCredential(bytes32 credentialHash) external;
    function getCredential(bytes32 credentialHash) external view returns (Credential memory);
    function isCredentialValid(bytes32 credentialHash) external view returns (bool);
}
