// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IRegistryAccessControl.sol";

/**
 * @title RegistryAccessControl
 * @notice Reusable role-based access control: one owner and a set of authorized issuers.
 * @dev Kept separate from the credential logic so each module can be read and
 *      tested on its own. All failures use custom errors.
 */
abstract contract RegistryAccessControl is IRegistryAccessControl {
    address private _owner;
    address private _pendingOwner;
    mapping(address => bool) private _authorizedIssuers;

    modifier onlyOwner() {
        if (msg.sender != _owner) revert NotOwner(msg.sender);
        _;
    }

    modifier onlyAuthorizedIssuer() {
        if (!_authorizedIssuers[msg.sender]) revert NotAuthorizedIssuer(msg.sender);
        _;
    }

    constructor(address initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();
        _owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    // ---------- Ownership (two-step) ----------

    /// @inheritdoc IRegistryAccessControl
    function owner() public view override returns (address) {
        return _owner;
    }

    /// @inheritdoc IRegistryAccessControl
    function pendingOwner() external view override returns (address) {
        return _pendingOwner;
    }

    /**
     * @notice Starts handing the admin role to `newOwner`, who must call
     *         {acceptOwnership} to complete the transfer.
     */
    function transferOwnership(address newOwner) external override onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        _pendingOwner = newOwner;
        emit OwnershipTransferStarted(_owner, newOwner);
    }

    /// @notice Completes an ownership transfer started by the current owner.
    function acceptOwnership() external override {
        if (msg.sender != _pendingOwner) revert NotPendingOwner(msg.sender);
        address previousOwner = _owner;
        _owner = msg.sender;
        _pendingOwner = address(0);
        emit OwnershipTransferred(previousOwner, msg.sender);
    }

    // ---------- Issuer management ----------

    /// @notice Authorizes an institution wallet to issue credentials.
    function authorizeIssuer(address issuer) external override onlyOwner {
        if (issuer == address(0)) revert ZeroAddress();
        if (_authorizedIssuers[issuer]) revert IssuerAlreadyAuthorized(issuer);
        _authorizedIssuers[issuer] = true;
        emit IssuerAuthorized(issuer);
    }

    /**
     * @notice Removes an institution's authorization.
     * @dev Credentials it registered stay on record but stop validating, which lets
     *      the owner neutralize a compromised issuer key in one transaction.
     */
    function deauthorizeIssuer(address issuer) external override onlyOwner {
        if (!_authorizedIssuers[issuer]) revert IssuerNotAuthorized(issuer);
        _authorizedIssuers[issuer] = false;
        emit IssuerDeauthorized(issuer);
    }

    /// @inheritdoc IRegistryAccessControl
    function isAuthorizedIssuer(address issuer) public view override returns (bool) {
        return _authorizedIssuers[issuer];
    }
}
