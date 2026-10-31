const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CredentialRegistry", function () {
  async function deployRegistry() {
    const [owner, issuer, other] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("CredentialRegistry");
    const registry = await Registry.deploy();
    return { registry, owner, issuer, other };
  }

  it("allows the owner to authorize an issuer", async function () {
    const { registry, issuer } = await deployRegistry();
    await registry.authorizeIssuer(issuer.address);
    expect(await registry.isAuthorizedIssuer(issuer.address)).to.equal(true);
  });

  it("allows an authorized issuer to register and verify a credential", async function () {
    const { registry, issuer } = await deployRegistry();
    await registry.authorizeIssuer(issuer.address);

    const hash = ethers.sha256(ethers.toUtf8Bytes("sample academic credential"));
    await registry.connect(issuer).registerCredential(hash);

    const credential = await registry.getCredential(hash);
    expect(credential.issuer).to.equal(issuer.address);
    expect(credential.exists).to.equal(true);
    expect(credential.revoked).to.equal(false);
    expect(await registry.isCredentialValid(hash)).to.equal(true);
  });

  it("prevents unauthorized wallets from registering credentials", async function () {
    const { registry, other } = await deployRegistry();
    const hash = ethers.sha256(ethers.toUtf8Bytes("unauthorized credential"));

    await expect(registry.connect(other).registerCredential(hash)).to.be.revertedWith(
      "Caller is not an authorized issuer"
    );
  });

  it("allows the original issuer to revoke a credential", async function () {
    const { registry, issuer } = await deployRegistry();
    await registry.authorizeIssuer(issuer.address);

    const hash = ethers.sha256(ethers.toUtf8Bytes("credential to revoke"));
    await registry.connect(issuer).registerCredential(hash);
    await registry.connect(issuer).revokeCredential(hash);

    expect(await registry.isCredentialValid(hash)).to.equal(false);
  });
});
