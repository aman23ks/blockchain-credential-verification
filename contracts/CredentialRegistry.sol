// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./access/RegistryAccessControl.sol";
import "./interfaces/ICredentialRegistry.sol";

/**
 * @title CredentialRegistry
 * @notice Blockchain-based academic credential verification.
 * @dev The contract stores only credential hashes and minimal metadata. The original
 *      credential document and personally identifiable information stay off-chain.
 *      Role management lives in {RegistryAccessControl}; this contract holds the
 *      credential lifecycle (register, revoke, verify).
 */
contract CredentialRegistry is RegistryAccessControl, ICredentialRegistry {
    mapping(bytes32 => Credential) private _credentials;

    /// @dev The deployer becomes the registry administrator (owner).
    constructor() RegistryAccessControl(msg.sender) {}

    /**
     * @notice Registers the hash of an academic credential.
     * @param credentialHash SHA-256 hash computed from the credential file off-chain.
     */
    function registerCredential(bytes32 credentialHash) external override onlyAuthorizedIssuer {
        if (credentialHash == bytes32(0)) revert EmptyCredentialHash();
        if (_credentials[credentialHash].exists) revert CredentialAlreadyRegistered(credentialHash);

        _credentials[credentialHash] = Credential({
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
        Credential storage credential = _credentials[credentialHash];
        if (!credential.exists) revert CredentialNotFound(credentialHash);
        if (credential.issuer != msg.sender) revert NotOriginalIssuer(credentialHash, msg.sender);
        if (credential.revoked) revert CredentialAlreadyRevoked(credentialHash);

        credential.revoked = true;
        emit CredentialRevoked(credentialHash, msg.sender);
    }

    /**
     * @notice Returns the stored metadata for a credential hash.
     * @dev Unknown hashes return a zeroed struct with `exists == false`.
     */
    function getCredential(bytes32 credentialHash) external view override returns (Credential memory) {
        return _credentials[credentialHash];
    }

    /**
     * @notice Checks whether a credential is currently valid.
     * @return True only when the credential exists, is not revoked, and its issuer
     *         is currently authorized.
     */
    function isCredentialValid(bytes32 credentialHash) external view override returns (bool) {
        Credential memory credential = _credentials[credentialHash];
        return credential.exists && !credential.revoked && isAuthorizedIssuer(credential.issuer);
    }
}
