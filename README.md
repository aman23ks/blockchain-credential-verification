# Blockchain-Based Academic Credential Verification

CSE 540 Blockchain Engineering — Group 27

Academic credentials such as degrees and certificates can be altered or fabricated, and verifying them usually means contacting the issuing institution. This project provides a shared, tamper-evident verification layer on Ethereum.

Authorized institutions register the **SHA-256 hash** of each credential in a smart contract. The credential file and all personally identifiable information stay **off-chain** with the student. Anyone holding the file can hash it and check the on-chain record. If even one character of the document changes, its hash no longer matches.

## Features

- **Role-based access control**: a registry owner (admin) manages which institution wallets may issue credentials.
- **Two-step ownership transfer**: the admin role can be handed over safely (`transferOwnership` followed by `acceptOwnership`).
- **Credential registration**: an authorized issuer registers a credential hash. The issuer address and block timestamp are recorded.
- **Revocation**: only the institution that issued a credential can revoke it.
- **Verification**: a free read-only check. A credential is valid only if it exists, is not revoked, and its issuer is still authorized.
- **Events** for every state change, which the web client shows as an on-chain audit log.
- **Custom errors** for every failure (for example `NotAuthorizedIssuer(address)` or `CredentialAlreadyRegistered(bytes32)`), decoded into plain-language messages in the UI.
- **Web client** with an Admin, an Issuer and a Verifier panel. Files are hashed in the browser. Transactions are signed either with local test accounts or with **MetaMask**.
- **Sepolia testnet** deployment support.

## Architecture

```text
 Registry Admin      Issuing Institution      Verifier / Employer
        \                    |                       /
         v                   v                      v
   Web client (frontend/index.html) — SHA-256 in the browser (Web Crypto API)
                             |
                 ethers.js v6 + MetaMask / local RPC
                             |
                             v
              CredentialRegistry smart contract (EVM)
       ├── RegistryAccessControl   owner, issuers, two-step ownership
       └── credential lifecycle    register · revoke · verify · events
```

Only the 32-byte hash and minimal metadata go on-chain:

| Stored on-chain | Kept off-chain |
| --- | --- |
| Credential hash (`bytes32`) | The credential file (PDF, TXT, …) |
| Issuer address, issue timestamp | Student name, grades, IDs |
| Revoked / exists flags | |
| Set of authorized issuers | |

## Smart Contracts

```text
contracts/
├── CredentialRegistry.sol             credential lifecycle (register, revoke, verify)
├── access/RegistryAccessControl.sol   reusable RBAC module (owner + issuers)
├── interfaces/ICredentialRegistry.sol    struct, events, custom errors, API
├── interfaces/IRegistryAccessControl.sol role events, custom errors, API
└── mocks/RegistryAccessControlMock.sol   test-only helper
```

| Function | Who can call | Purpose |
| --- | --- | --- |
| `authorizeIssuer(address)` | Owner | Authorize an institution wallet |
| `deauthorizeIssuer(address)` | Owner | Remove an institution; its credentials stop validating |
| `transferOwnership(address)` / `acceptOwnership()` | Owner / pending owner | Two-step admin handover |
| `registerCredential(bytes32)` | Authorized issuer | Register a credential hash |
| `revokeCredential(bytes32)` | Original issuer | Revoke a credential |
| `getCredential(bytes32)` | Anyone (view) | Issuer, issue time, revoked, exists |
| `isCredentialValid(bytes32)` | Anyone (view) | exists ∧ ¬revoked ∧ issuer currently authorized |
| `isAuthorizedIssuer(address)`, `owner()`, `pendingOwner()` | Anyone (view) | Role lookups |

### Custom errors

| Error | When it is raised |
| --- | --- |
| `NotOwner(caller)` | A non-owner calls an admin function |
| `NotPendingOwner(caller)` | Someone other than the pending owner calls `acceptOwnership` |
| `NotAuthorizedIssuer(caller)` | An unauthorized wallet tries to register |
| `ZeroAddress()` | The zero address is passed as an issuer or new owner |
| `IssuerAlreadyAuthorized(issuer)` / `IssuerNotAuthorized(issuer)` | A redundant authorize or deauthorize call |
| `EmptyCredentialHash()` | The zero hash is registered |
| `CredentialAlreadyRegistered(hash)` | A duplicate registration |
| `CredentialNotFound(hash)` | An unknown hash is revoked |
| `NotOriginalIssuer(hash, caller)` | Someone other than the issuer tries to revoke |
| `CredentialAlreadyRevoked(hash)` | A credential is revoked twice |

### Events

`IssuerAuthorized`, `IssuerDeauthorized`, `OwnershipTransferStarted`, `OwnershipTransferred`, `CredentialRegistered`, `CredentialRevoked`. Hashes and addresses are `indexed`, so they can be filtered by topic.

## Requirements

- Node.js 18 or newer, and npm
- A modern browser. MetaMask is optional for local use and required for Sepolia.

## Quick Start (local blockchain)

```bash
git clone https://github.com/aman23ks/blockchain-credential-verification.git
cd blockchain-credential-verification
npm install
```

Run each of these in its own terminal:

```bash
npm run node          # 1. local Hardhat blockchain on http://127.0.0.1:8545
npm run deploy:local  # 2. deploy the contract; writes frontend/deployment.json
npm run frontend      # 3. serve the web client at http://localhost:5173
```

Open **http://localhost:5173**. Sample files are in `demo-files/`.

> Restarting `npm run node` resets the chain, so run `npm run deploy:local` again afterwards. The page waits for the deployment and connects automatically.

### Using the web client

1. **Admin**: click **Authorize issuer**. The University wallet is pre-filled.
2. **Issuer**: drop `demo-files/diploma_jane_doe.txt`, then click **Register hash on-chain**.
3. **Verifier**: drop the same file. The result is **✔ Valid credential**.
4. **Tamper check**: drop `diploma_jane_doe_TAMPERED.txt`. The result is **✖ Not found**.
5. **Unauthorized wallet**: set *Acting as* to *Unauthorized wallet* and click **Register**. The transaction reverts with `NotAuthorizedIssuer`.
6. **Revocation**: as the University, click **Revoke**, then verify the original file again. The result is **✖ Invalid**.

### Signing with MetaMask (local)

Select **MetaMask** in the bar at the top and click **Connect MetaMask**. The page asks MetaMask to switch to (or add) the *Hardhat Local* network (chain ID 31337, RPC `http://127.0.0.1:8545`). To use a funded test wallet, import one of the private keys that `npm run node` prints. **These keys are public; never use them on a real network.** Account #0 is the registry owner.

## Deploying to Sepolia

1. Get a Sepolia RPC URL (for example from Infura or Alchemy) and fund a **test** wallet with Sepolia ETH.
2. Store the secrets as Hardhat configuration variables. They are kept outside the repository.

   ```bash
   npx hardhat vars set SEPOLIA_RPC_URL
   npx hardhat vars set SEPOLIA_PRIVATE_KEY
   npx hardhat vars set ETHERSCAN_API_KEY   # optional, for verification
   ```

3. Deploy, and optionally verify the source on Etherscan:

   ```bash
   npm run deploy:sepolia
   npx hardhat verify --network sepolia <deployed-address>
   ```

4. Run `npm run frontend` and open http://localhost:5173. On a public network the page uses MetaMask for both reads and writes. The deploying wallet is the registry owner.

## Testing

```bash
npm test          # 30 unit tests
npm run coverage  # line and branch coverage report
npm run demo      # scripted end-to-end workflow in the terminal
```

The test suite covers every function and every custom error: ownership transfer, issuer management, registration, verification, revocation, deauthorization cascades and constant gas cost. Coverage is **100%** for statements, branches, functions and lines (`mocks/` is excluded).

`npm run demo` runs the whole workflow with real files: deploy, authorize, register, verify the original, detect the tampered copy, block an unauthorized wallet, then revoke.

## Project Structure

```text
contracts/            Solidity sources (see above)
scripts/deploy.js     deploys and exports address + ABI to frontend/deployment.json
scripts/demo.js       end-to-end CLI demonstration
scripts/serve-frontend.js  minimal static server for the web client
frontend/index.html   single-page web client (ethers.js v6)
test/                 Hardhat / Mocha / Chai tests
demo-files/           sample diploma and a tampered copy
```

## Privacy and Scope

Credential documents and personal data are never stored on-chain; the blockchain acts only as an integrity and verification layer. A hash registry proves that a *document* is genuine, not who is presenting it. To make guessing attacks on templated documents infeasible, institutions should embed a random identifier in each credential before hashing. The project does not integrate with production university systems.

## Team

Project Group 27

- Abhinand Suresh
- Aman Shrivastava
- Bharanidharan Maheswaran
- Deepti Ravi Kumar
- Nirmalraju Kangeyan
