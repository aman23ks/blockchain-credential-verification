// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IRegistryAccessControl
 * @notice Role management for the credential registry.
 * @dev Two roles exist: a single owner (registry administrator) and any number of
 *      authorized issuers (institutions). Ownership moves in two steps so the admin
 *      role can never be handed to a mistyped address.
 */
interface IRegistryAccessControl {
    // ---------- Events ----------
    event IssuerAuthorized(address indexed issuer);
    event IssuerDeauthorized(address indexed issuer);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ---------- Errors ----------
    /// @notice Caller is not the registry owner.
    error NotOwner(address caller);
    /// @notice Caller is not the pending owner and cannot accept ownership.
    error NotPendingOwner(address caller);
    /// @notice Caller is not an authorized issuer.
    error NotAuthorizedIssuer(address caller);
    /// @notice The zero address was supplied where a real account is required.
    error ZeroAddress();
    /// @notice The issuer is already authorized.
    error IssuerAlreadyAuthorized(address issuer);
    /// @notice The issuer is not currently authorized.
    error IssuerNotAuthorized(address issuer);

    // ---------- Functions ----------
    function owner() external view returns (address);
    function pendingOwner() external view returns (address);
    function transferOwnership(address newOwner) external;
    function acceptOwnership() external;

    function authorizeIssuer(address issuer) external;
    function deauthorizeIssuer(address issuer) external;
    function isAuthorizedIssuer(address issuer) external view returns (bool);
}
