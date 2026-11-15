/**
 * End-to-end demo of the credential verification workflow.
 *
 *   npx hardhat run scripts/demo.js                      (in-process chain)
 *   npx hardhat run scripts/demo.js --network localhost  (against `npm run node`)
 *
 * Stakeholders: Admin (registry owner), University (issuer), Verifier (employer),
 * and an Attacker wallet that is not authorized.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const hre = require("hardhat");

const FILES = path.join(__dirname, "..", "demo-files");
const original = path.join(FILES, "diploma_jane_doe.txt");
const tampered = path.join(FILES, "diploma_jane_doe_TAMPERED.txt");

// SHA-256 computed off-chain; only this 32-byte hash goes on-chain.
function sha256File(file) {
  return "0x" + crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

const step = (n, msg) => console.log(`\n=== Step ${n}: ${msg} ===`);
const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;

async function verify(registry, file, who) {
  const hash = sha256File(file);
  const record = await registry.getCredential(hash);
  const valid = await registry.isCredentialValid(hash);
  console.log(`  [${who}] file:   ${path.basename(file)}`);
  console.log(`  [${who}] sha256: ${hash}`);
  if (!record.exists) {
    console.log(`  [${who}] RESULT: ❌ NOT FOUND — no matching credential on-chain`);
    return;
  }
  console.log(`  [${who}] issuer: ${short(record.issuer)}  issuedAt: ${new Date(Number(record.issuedAt) * 1000).toISOString()}  revoked: ${record.revoked}`);
  console.log(`  [${who}] RESULT: ${valid ? "✅ VALID" : "❌ INVALID (revoked or issuer no longer authorized)"}`);
}

async function expectRevert(promise, label) {
  try {
    await promise;
    console.log(`  ${label}: unexpectedly succeeded`);
  } catch (e) {
    const reason = e.shortMessage || e.reason || e.message;
    console.log(`  ${label}: ⛔ reverted — ${reason}`);
  }
}

async function main() {
  const [admin, university, verifier, attacker] = await hre.ethers.getSigners();
  console.log("Stakeholders:");
  console.log(`  Admin      ${admin.address}`);
  console.log(`  University ${university.address}`);
  console.log(`  Verifier   ${verifier.address}`);
  console.log(`  Attacker   ${attacker.address}`);

  step(1, "Admin deploys CredentialRegistry");
  const registry = await (await hre.ethers.getContractFactory("CredentialRegistry", admin)).deploy();
  await registry.waitForDeployment();
  console.log(`  Deployed at ${await registry.getAddress()} (owner = Admin)`);

  step(2, "Admin authorizes the University wallet");
  let rc = await (await registry.authorizeIssuer(university.address)).wait();
  console.log(`  tx ${short(rc.hash)} → event IssuerAuthorized(${short(university.address)})`);
  console.log(`  isAuthorizedIssuer(University) = ${await registry.isAuthorizedIssuer(university.address)}`);

  step(3, "University hashes the diploma off-chain and registers the hash");
  const hash = sha256File(original);
  console.log(`  sha256(${path.basename(original)}) = ${hash}`);
  rc = await (await registry.connect(university).registerCredential(hash)).wait();
  console.log(`  tx ${short(rc.hash)} gasUsed=${rc.gasUsed} → event CredentialRegistered`);

  step(4, "Verifier checks the ORIGINAL diploma");
  await verify(registry.connect(verifier), original, "Verifier");

  step(5, "Verifier checks a TAMPERED diploma (degree changed to PhD)");
  await verify(registry.connect(verifier), tampered, "Verifier");

  step(6, "Attacker tries to register a fake credential / revoke the real one");
  await expectRevert(registry.connect(attacker).registerCredential(sha256File(tampered)), "registerCredential");
  await expectRevert(registry.connect(attacker).revokeCredential(hash), "revokeCredential");

  step(7, "University revokes the diploma; Verifier re-checks");
  rc = await (await registry.connect(university).revokeCredential(hash)).wait();
  console.log(`  tx ${short(rc.hash)} → event CredentialRevoked`);
  await verify(registry.connect(verifier), original, "Verifier");

  console.log("\nDemo complete.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
