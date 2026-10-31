// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ICredentialRegistry.sol";

/**
 * @title CredentialRegistry
 * @notice Draft smart contract for blockchain-based academic credential verification.
 * @dev The contract stores only credential hashes and minimal metadata. The original
 *      credential document and personally identifiable information stay off-chain.
 */
contract CredentialRegistry is ICredentialRegistry {
    address public owner;

    mapping(address => bool) private authorizedIssuers;
    mapping(bytes32 => Credential) private credentials;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    modifier onlyAuthorizedIssuer() {
        require(authorizedIssuers[msg.sender], "Caller is not an authorized issuer");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Authorizes an institution wallet to issue credentials.
     * @dev In this draft, the deployer acts as the registry administrator.
     */
    function authorizeIssuer(address issuer) external override onlyOwner {
        require(issuer != address(0), "Invalid issuer address");
        require(!authorizedIssuers[issuer], "Issuer already authorized");
        authorizedIssuers[issuer] = true;
        emit IssuerAuthorized(issuer);
    }

    /**
     * @notice Removes an institution's authorization to issue new credentials.
     * @dev Existing credentials remain recorded, but validity checks require the
     *      original issuer to still be authorized.
     */
    function deauthorizeIssuer(address issuer) external override onlyOwner {
        require(authorizedIssuers[issuer], "Issuer is not authorized");
        authorizedIssuers[issuer] = false;
        emit IssuerDeauthorized(issuer);
    }

    /**
     * @notice Registers the hash of an academic credential.
     * @param credentialHash SHA-256 hash computed from the credential file off-chain.
     */
    function registerCredential(bytes32 credentialHash) external override onlyAuthorizedIssuer {
        require(credentialHash != bytes32(0), "Credential hash cannot be empty");
        require(!credentials[credentialHash].exists, "Credential already registered");

        credentials[credentialHash] = Credential({
            issuer: msg.sender,
            issuedAt: block.timestamp,
            revoked: false,
            exists: true
        });

        emit CredentialRegistered(credentialHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Revokes a previously issued credential.
     * @dev Only the institution that originally registered the credential may revoke it.
     */
    function revokeCredential(bytes32 credentialHash) external override {
        Credential storage credential = credentials[credentialHash];
        require(credential.exists, "Credential does not exist");
        require(credential.issuer == msg.sender, "Only original issuer can revoke");
        require(!credential.revoked, "Credential already revoked");

        credential.revoked = true;
        emit CredentialRevoked(credentialHash, msg.sender);
    }

    /**
     * @notice Returns the stored metadata for a credential hash.
     * @dev A verifier can compare a locally computed SHA-256 hash with this record.
     */
    function getCredential(bytes32 credentialHash) external view override returns (Credential memory) {
        return credentials[credentialHash];
    }

    /**
     * @notice Checks whether an institution wallet is currently authorized.
     */
    function isAuthorizedIssuer(address issuer) external view override returns (bool) {
        return authorizedIssuers[issuer];
    }

    /**
     * @notice Checks whether a credential is currently valid.
     * @return True only when the credential exists, is not revoked, and its issuer
     *         is currently authorized.
     */
    function isCredentialValid(bytes32 credentialHash) external view override returns (bool) {
        Credential memory credential = credentials[credentialHash];
        return credential.exists && !credential.revoked && authorizedIssuers[credential.issuer];
    }
}
