# Blockchain-Based Academic Credential Verification System

CSE 540 Blockchain Engineering - Group 27

## Project Description

Academic credentials such as degrees and certificates can be altered or fabricated, while traditional verification may require employers or other verifiers to contact the issuing institution directly. This project proposes a blockchain-based academic credential verification system that provides a shared, tamper-evident verification layer.

Authorized institutions register a cryptographic hash of a credential on an Ethereum-compatible blockchain. The original credential file and personally identifiable information remain off-chain. A verifier can compute the SHA-256 hash of a submitted credential and compare it with the on-chain record. If the document has been modified, its hash will no longer match the registered value.

The draft smart contract supports:

- Authorized issuer management
- Credential hash registration
- Credential metadata retrieval
- Credential revocation
- Issuer verification
- Credential validity checking
- Events for important contract actions

## Architecture

The planned system separates private credential handling from blockchain verification.

```text
Issuer / Student / Verifier
            |
            v
    React Web Application
            |
            v
 Credential Hashing (SHA-256)
       /             \
      v               v
MetaMask       CredentialRegistry
                    Smart Contract
                         |
                         v
               Ethereum-Compatible
                    Blockchain
```

The React application will eventually handle credential selection, SHA-256 hashing, wallet connection, and user interaction. MetaMask will authorize blockchain transactions. Only the credential hash and minimal verification metadata are stored on-chain.

## Smart Contract Design

### `ICredentialRegistry.sol`

Defines the public interface of the credential registry, including the `Credential` structure, events, and function signatures.

### `CredentialRegistry.sol`

Provides the draft implementation of the registry.

Each credential stores:

- `issuer`: wallet address of the issuing institution
- `issuedAt`: blockchain timestamp when the credential was registered
- `revoked`: whether the credential has been revoked
- `exists`: whether the credential hash has been registered

The credential document itself is **not** stored on-chain.

### Main Contract Functions

| Function | Purpose |
| --- | --- |
| `authorizeIssuer(address)` | Allows the contract owner to authorize an institution wallet. |
| `deauthorizeIssuer(address)` | Removes an institution's authorization. |
| `registerCredential(bytes32)` | Registers a credential hash and issuance metadata. |
| `revokeCredential(bytes32)` | Allows the original issuer to revoke a credential. |
| `getCredential(bytes32)` | Retrieves stored credential metadata. |
| `isAuthorizedIssuer(address)` | Checks whether an issuer is currently authorized. |
| `isCredentialValid(bytes32)` | Checks existence, revocation status, and issuer authorization. |

## Dependencies

The draft uses:

- Node.js 18 or newer
- npm
- Solidity 0.8.24
- Hardhat
- Hardhat Toolbox
- ethers.js through Hardhat Toolbox

The planned frontend will use React, ethers.js, MetaMask, and SHA-256 hashing.

## Setup

Clone the repository:

```bash
git clone https://github.com/aman23ks/blockchain-credential-verification.git
cd blockchain-credential-verification
```

Install dependencies:

```bash
npm install
```

Compile the contracts:

```bash
npm run compile
```

Run the draft tests:

```bash
npm test
```

## Local Deployment

Start a local Hardhat blockchain in one terminal:

```bash
npm run node
```

In another terminal, deploy the contract:

```bash
npm run deploy:local
```

The deployment script will print the local `CredentialRegistry` contract address.

## Intended Usage

At a high level, the completed application will follow this workflow:

1. The registry administrator authorizes an academic institution's wallet.
2. The institution selects a credential file in the web application.
3. The application computes the file's SHA-256 hash locally.
4. The authorized institution registers that hash through the smart contract.
5. A student can later provide the credential file to a verifier.
6. The verifier hashes the submitted file and queries the registry using the resulting hash.
7. The system checks whether the credential exists, whether its issuer is authorized, and whether it has been revoked.
8. The original issuer can revoke a credential when necessary.

## Current Project Status

This repository currently contains the **draft smart contract design**. Contract interfaces, core data structures, function signatures, high-level implementation, deployment setup, and starter tests are included. Frontend integration and public test-network deployment are planned for later project stages.

## Privacy and Scope

Credential documents and personally identifiable information are intentionally kept off-chain. The blockchain acts only as a verification and integrity layer by storing hashes and minimal metadata.

The course-scale project does not attempt to integrate with production university information systems or store complete student records on-chain.

## Team

Project Group 27

- Abhinand Suresh
- Aman Shrivastava
- Bharanidharan Maheswaran
- Deepti Ravi Kumar
- Nirmalraju Kangeyan
