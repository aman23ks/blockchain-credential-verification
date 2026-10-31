// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ICredentialRegistry
 * @notice Interface for the academic credential registry.
 * @dev Credential files and personal information remain off-chain. Only a
 *      SHA-256 credential hash and verification metadata are stored on-chain.
 */
interface ICredentialRegistry {
    struct Credential {
        address issuer;
        uint256 issuedAt;
        bool revoked;
        bool exists;
    }

    event IssuerAuthorized(address indexed issuer);
    event IssuerDeauthorized(address indexed issuer);
    event CredentialRegistered(bytes32 indexed credentialHash, address indexed issuer, uint256 issuedAt);
    event CredentialRevoked(bytes32 indexed credentialHash, address indexed issuer);

    function authorizeIssuer(address issuer) external;
    function deauthorizeIssuer(address issuer) external;
    function registerCredential(bytes32 credentialHash) external;
    function revokeCredential(bytes32 credentialHash) external;
    function getCredential(bytes32 credentialHash) external view returns (Credential memory);
    function isAuthorizedIssuer(address issuer) external view returns (bool);
    function isCredentialValid(bytes32 credentialHash) external view returns (bool);
}
