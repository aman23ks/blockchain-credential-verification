# Interim Demo — Recording Script (target 5:00, allowed 4:30–5:30)

Group 27 · Blockchain-Based Academic Credential Verification

Spoken text is about 700 words, which takes about 5 minutes at a normal pace. **Time one full rehearsal** before recording.

---

## Before you hit Record (setup, not recorded)

Open three terminal tabs in `blockchain-credential-verification-main/`:

```bash
npm install
```

```bash
npm run node            # Terminal 1 — leave running
```

```bash
npm run deploy:local    # Terminal 2 — writes frontend/deployment.json
```

```bash
npm run frontend        # Terminal 3 — serves http://localhost:5173
```

Then:

- Open **http://localhost:5173** in your browser. The header should show `chainId 31337 · contract 0x5FbD…`.
- Open VS Code (or GitHub) with these files in tabs: `contracts/ICredentialRegistry.sol`, `contracts/CredentialRegistry.sol`, `frontend/index.html`, `test/CredentialRegistry.test.js`.
- In Finder, open `demo-files/` so you can drag files into the browser.
- In Zoom, share your **whole screen** (not a single window) so you can switch between the browser, VS Code and the terminal.
- Each run starts from a fresh contract. To reset after a practice run, stop Terminal 1 (Ctrl+C), run `npm run node` again, then run `npm run deploy:local` again and refresh the page.

---

## 0:00 – 0:30 · Intro and problem  *(screen: browser UI)*

> Hi, we're Group 27. Our project is a blockchain-based academic credential verification system.
> The problem: diplomas can be forged or edited. Today an employer has to contact the university to check one.
> Our approach: an authorized university registers only the **SHA-256 hash** of the credential on an Ethereum smart contract. The document and personal data stay off-chain. Any verifier can hash the file they were given and check it against the chain. If even one character changed, the hash won't match.

## 0:30 – 1:15 · Current project status  *(screen: README or a simple slide)*

> **Implemented:**
> - the `CredentialRegistry` smart contract in Solidity, with issuer authorization, credential registration, revocation and validity checks, plus events for each action
> - nine passing Hardhat unit tests
> - a local deployment script
> - an end-to-end demo script
> - a working web frontend with three roles (registry admin, issuing institution and verifier) that hashes files in the browser
>
> **In progress:** MetaMask wallet integration. Right now the UI signs with local Hardhat test accounts.
>
> **Remaining milestones:**
> - deploy to the Sepolia public testnet
> - move the frontend to React
> - add batch issuance and a credential lookup by transaction for the final demo

## 1:15 – 3:15 · Live demo: stakeholder workflow  *(screen: browser)*

**1. Admin authorizes the university** *(click Authorize issuer)*
> First, the registry admin, the contract owner, authorizes the university's wallet. The transaction is confirmed in a block, and you can see the `IssuerAuthorized` event in the on-chain log at the bottom.

**2. University issues a credential** *(drag `diploma_jane_doe.txt` into the Issuing Institution box)*
> Next, the university selects Jane Doe's diploma. The browser computes the SHA-256 hash locally. Only this 32-byte hash is sent on-chain, never the file. *(click Register hash on-chain)* That's confirmed, and the `CredentialRegistered` event records the hash, the issuer and the timestamp.

**3. Employer verifies the original** *(drag `diploma_jane_doe.txt` into the Verifier box)*
> Now Jane gives her diploma to an employer. The verifier hashes it and queries the contract. This is a read-only call, so there's no gas and no wallet needed. The result: **Valid**, issued by the university, which is still authorized, and not revoked.

**4. Tamper detection** *(drag `diploma_jane_doe_TAMPERED.txt` into the Verifier box)*
> Here's a copy where someone changed "Master of Science" to "Doctor of Philosophy". The hash is completely different, so the result is **Not found**. The forgery is detected.

**5. Unauthorized wallet** *(Acting as → Unauthorized wallet, click Register hash on-chain)*
> What if a random wallet tries to issue the same diploma? The contract reverts with the custom error `NotAuthorizedIssuer`, and the page explains it in plain language. *(click Revoke)* It also can't revoke someone else's credential: `NotOriginalIssuer`.

**6. Revocation** *(Acting as → University, click Revoke, then drop the original into the Verifier box again)*
> Finally, the university revokes the credential, for example after an academic integrity case. When the employer checks the same file again, it now shows **Invalid, revoked by the issuer**.

## 3:15 – 4:30 · High-level code walkthrough  *(screen: VS Code or GitHub)*

**`contracts/ICredentialRegistry.sol`**
> The interface defines the `Credential` struct: issuer address, issuance timestamp, a revoked flag and an exists flag. That's all we store on-chain. It also defines four events and the function signatures.

**`contracts/CredentialRegistry.sol`**
> The implementation has two mappings: `authorizedIssuers` and `credentials`, which is keyed by the bytes32 hash.
> - `onlyOwner` guards `authorizeIssuer` and `deauthorizeIssuer`.
> - `registerCredential` uses the `onlyAuthorizedIssuer` modifier, rejects empty or duplicate hashes, stores the struct and emits `CredentialRegistered`.
> - `revokeCredential` requires that the caller is the **original issuer**.
> - `isCredentialValid` is the single check verifiers use. A credential is valid only if it exists, isn't revoked, and its issuer is **still authorized**. So if we deauthorize a university, its credentials stop validating.

**`frontend/index.html`** *(scroll to `sha256Hex` and `contractAs`)*
> The frontend uses ethers.js. `sha256Hex` hashes the file with the browser's Web Crypto API, so the document never leaves the user's machine. `deploy.js` writes the contract address and ABI to `deployment.json`, and the page loads it from there.

## 4:30 – 5:00 · Tests and wrap-up  *(screen: terminal, run `npm test`)*

> Our test suite covers authorization, registration, tamper detection, duplicate rejection, issuer-only revocation, deauthorization, and owner-only access. All nine pass.
> Next, we're integrating MetaMask, deploying to Sepolia, and moving the UI to React for the final demo. Thanks!

---

## Backup plan

If the browser misbehaves while recording, run this in a terminal:

```bash
npm run demo
```

It walks through the same seven-step workflow with clear console output: deploy, authorize, register, verify, tamper, unauthorized attempt, and revoke.

## Checklist before submitting

- [ ] The recording is between 4:30 and 5:30
- [ ] The audio is clear and the code text is readable (zoom VS Code to about 150%)
- [ ] The Zoom cloud recording link and passcode are pasted into `interim_demo_submission.txt`, and that file is uploaded to Canvas
