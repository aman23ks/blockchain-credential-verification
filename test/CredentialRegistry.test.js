const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

const hashOf = (text) => ethers.sha256(ethers.toUtf8Bytes(text));

describe("CredentialRegistry", function () {
  async function deployFixture() {
    const [owner, university, otherUniversity, verifier, attacker, newAdmin] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("CredentialRegistry");
    const registry = await Registry.deploy();
    return { registry, owner, university, otherUniversity, verifier, attacker, newAdmin };
  }

  async function issuedFixture() {
    const ctx = await deployFixture();
    await ctx.registry.authorizeIssuer(ctx.university.address);
    const hash = hashOf("Jane Doe - MS Computer Science - 2026");
    await ctx.registry.connect(ctx.university).registerCredential(hash);
    return { ...ctx, hash };
  }

  // ------------------------------------------------------------------
  describe("Deployment and ownership", function () {
    it("makes the deployer the owner and emits OwnershipTransferred", async function () {
      const { registry, owner } = await loadFixture(deployFixture);
      expect(await registry.owner()).to.equal(owner.address);
      expect(await registry.pendingOwner()).to.equal(ethers.ZeroAddress);
      await expect(registry.deploymentTransaction())
        .to.emit(registry, "OwnershipTransferred")
        .withArgs(ethers.ZeroAddress, owner.address);
    });

    it("rejects a zero-address initial owner in the access-control module", async function () {
      const Mock = await ethers.getContractFactory("RegistryAccessControlMock");
      await expect(Mock.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(Mock, "ZeroAddress");
    });

    it("transfers ownership in two steps", async function () {
      const { registry, owner, newAdmin } = await loadFixture(deployFixture);
      await expect(registry.transferOwnership(newAdmin.address))
        .to.emit(registry, "OwnershipTransferStarted")
        .withArgs(owner.address, newAdmin.address);
      expect(await registry.owner()).to.equal(owner.address); // not yet transferred
      expect(await registry.pendingOwner()).to.equal(newAdmin.address);

      await expect(registry.connect(newAdmin).acceptOwnership())
        .to.emit(registry, "OwnershipTransferred")
        .withArgs(owner.address, newAdmin.address);
      expect(await registry.owner()).to.equal(newAdmin.address);
      expect(await registry.pendingOwner()).to.equal(ethers.ZeroAddress);
    });

    it("gives the new owner admin rights and removes them from the old owner", async function () {
      const { registry, owner, newAdmin, university } = await loadFixture(deployFixture);
      await registry.transferOwnership(newAdmin.address);
      await registry.connect(newAdmin).acceptOwnership();

      await expect(registry.authorizeIssuer(university.address))
        .to.be.revertedWithCustomError(registry, "NotOwner")
        .withArgs(owner.address);
      await expect(registry.connect(newAdmin).authorizeIssuer(university.address))
        .to.emit(registry, "IssuerAuthorized");
    });

    it("rejects ownership transfer by a non-owner", async function () {
      const { registry, attacker } = await loadFixture(deployFixture);
      await expect(registry.connect(attacker).transferOwnership(attacker.address))
        .to.be.revertedWithCustomError(registry, "NotOwner")
        .withArgs(attacker.address);
    });

    it("rejects transferring ownership to the zero address", async function () {
      const { registry } = await loadFixture(deployFixture);
      await expect(registry.transferOwnership(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(registry, "ZeroAddress");
    });

    it("rejects acceptOwnership from anyone but the pending owner", async function () {
      const { registry, newAdmin, attacker } = await loadFixture(deployFixture);
      await registry.transferOwnership(newAdmin.address);
      await expect(registry.connect(attacker).acceptOwnership())
        .to.be.revertedWithCustomError(registry, "NotPendingOwner")
        .withArgs(attacker.address);
    });
  });

  // ------------------------------------------------------------------
  describe("Issuer management (RBAC)", function () {
    it("lets the owner authorize an issuer", async function () {
      const { registry, university } = await loadFixture(deployFixture);
      await expect(registry.authorizeIssuer(university.address))
        .to.emit(registry, "IssuerAuthorized")
        .withArgs(university.address);
      expect(await registry.isAuthorizedIssuer(university.address)).to.equal(true);
    });

    it("rejects authorization by a non-owner", async function () {
      const { registry, attacker } = await loadFixture(deployFixture);
      await expect(registry.connect(attacker).authorizeIssuer(attacker.address))
        .to.be.revertedWithCustomError(registry, "NotOwner")
        .withArgs(attacker.address);
    });

    it("rejects authorizing the zero address", async function () {
      const { registry } = await loadFixture(deployFixture);
      await expect(registry.authorizeIssuer(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(registry, "ZeroAddress");
    });

    it("rejects authorizing an issuer twice", async function () {
      const { registry, university } = await loadFixture(deployFixture);
      await registry.authorizeIssuer(university.address);
      await expect(registry.authorizeIssuer(university.address))
        .to.be.revertedWithCustomError(registry, "IssuerAlreadyAuthorized")
        .withArgs(university.address);
    });

    it("lets the owner deauthorize an issuer", async function () {
      const { registry, university } = await loadFixture(deployFixture);
      await registry.authorizeIssuer(university.address);
      await expect(registry.deauthorizeIssuer(university.address))
        .to.emit(registry, "IssuerDeauthorized")
        .withArgs(university.address);
      expect(await registry.isAuthorizedIssuer(university.address)).to.equal(false);
    });

    it("rejects deauthorization by a non-owner", async function () {
      const { registry, university, attacker } = await loadFixture(deployFixture);
      await registry.authorizeIssuer(university.address);
      await expect(registry.connect(attacker).deauthorizeIssuer(university.address))
        .to.be.revertedWithCustomError(registry, "NotOwner")
        .withArgs(attacker.address);
    });

    it("rejects deauthorizing an address that is not an issuer", async function () {
      const { registry, attacker } = await loadFixture(deployFixture);
      await expect(registry.deauthorizeIssuer(attacker.address))
        .to.be.revertedWithCustomError(registry, "IssuerNotAuthorized")
        .withArgs(attacker.address);
    });
  });

  // ------------------------------------------------------------------
  describe("Credential registration", function () {
    it("stores issuer, timestamp and status, and emits CredentialRegistered", async function () {
      const { registry, university } = await loadFixture(deployFixture);
      await registry.authorizeIssuer(university.address);
      const hash = hashOf("sample academic credential");

      const tx = await registry.connect(university).registerCredential(hash);
      const issuedAt = await time.latest();
      await expect(tx).to.emit(registry, "CredentialRegistered").withArgs(hash, university.address, issuedAt);

      const credential = await registry.getCredential(hash);
      expect(credential.issuer).to.equal(university.address);
      expect(credential.issuedAt).to.equal(issuedAt);
      expect(credential.revoked).to.equal(false);
      expect(credential.exists).to.equal(true);
      expect(await registry.isCredentialValid(hash)).to.equal(true);
    });

    it("rejects registration by an unauthorized wallet", async function () {
      const { registry, attacker } = await loadFixture(deployFixture);
      await expect(registry.connect(attacker).registerCredential(hashOf("fake")))
        .to.be.revertedWithCustomError(registry, "NotAuthorizedIssuer")
        .withArgs(attacker.address);
    });

    it("rejects registration by a deauthorized issuer", async function () {
      const { registry, university } = await loadFixture(issuedFixture);
      await registry.deauthorizeIssuer(university.address);
      await expect(registry.connect(university).registerCredential(hashOf("after removal")))
        .to.be.revertedWithCustomError(registry, "NotAuthorizedIssuer")
        .withArgs(university.address);
    });

    it("rejects the empty (zero) hash", async function () {
      const { registry, university } = await loadFixture(deployFixture);
      await registry.authorizeIssuer(university.address);
      await expect(registry.connect(university).registerCredential(ethers.ZeroHash))
        .to.be.revertedWithCustomError(registry, "EmptyCredentialHash");
    });

    it("rejects duplicate registration, even by another issuer", async function () {
      const { registry, otherUniversity, hash } = await loadFixture(issuedFixture);
      await registry.authorizeIssuer(otherUniversity.address);
      await expect(registry.connect(otherUniversity).registerCredential(hash))
        .to.be.revertedWithCustomError(registry, "CredentialAlreadyRegistered")
        .withArgs(hash);
    });
  });

  // ------------------------------------------------------------------
  describe("Verification", function () {
    it("lets any account verify without a transaction", async function () {
      const { registry, verifier, hash } = await loadFixture(issuedFixture);
      expect(await registry.connect(verifier).isCredentialValid(hash)).to.equal(true);
    });

    it("does not match a tampered credential", async function () {
      const { registry } = await loadFixture(issuedFixture);
      const tampered = hashOf("Jane Doe - PhD Computer Science - 2026");
      expect((await registry.getCredential(tampered)).exists).to.equal(false);
      expect(await registry.isCredentialValid(tampered)).to.equal(false);
    });

    it("returns an empty record for an unknown hash", async function () {
      const { registry } = await loadFixture(deployFixture);
      const record = await registry.getCredential(hashOf("never issued"));
      expect(record.exists).to.equal(false);
      expect(record.issuer).to.equal(ethers.ZeroAddress);
      expect(record.issuedAt).to.equal(0n);
    });

    it("invalidates credentials when their issuer is deauthorized", async function () {
      const { registry, university, hash } = await loadFixture(issuedFixture);
      await registry.deauthorizeIssuer(university.address);
      expect((await registry.getCredential(hash)).exists).to.equal(true); // record kept
      expect(await registry.isCredentialValid(hash)).to.equal(false);
    });

    it("restores validity if the issuer is re-authorized", async function () {
      const { registry, university, hash } = await loadFixture(issuedFixture);
      await registry.deauthorizeIssuer(university.address);
      await registry.authorizeIssuer(university.address);
      expect(await registry.isCredentialValid(hash)).to.equal(true);
    });
  });

  // ------------------------------------------------------------------
  describe("Revocation", function () {
    it("lets the original issuer revoke and emits CredentialRevoked", async function () {
      const { registry, university, hash } = await loadFixture(issuedFixture);
      await expect(registry.connect(university).revokeCredential(hash))
        .to.emit(registry, "CredentialRevoked")
        .withArgs(hash, university.address);
      expect((await registry.getCredential(hash)).revoked).to.equal(true);
      expect(await registry.isCredentialValid(hash)).to.equal(false);
    });

    it("rejects revoking an unknown credential", async function () {
      const { registry, university } = await loadFixture(issuedFixture);
      const unknown = hashOf("unknown");
      await expect(registry.connect(university).revokeCredential(unknown))
        .to.be.revertedWithCustomError(registry, "CredentialNotFound")
        .withArgs(unknown);
    });

    it("rejects revocation by anyone other than the original issuer", async function () {
      const { registry, owner, otherUniversity, attacker, hash } = await loadFixture(issuedFixture);
      await registry.authorizeIssuer(otherUniversity.address);
      for (const caller of [attacker, otherUniversity, owner]) {
        await expect(registry.connect(caller).revokeCredential(hash))
          .to.be.revertedWithCustomError(registry, "NotOriginalIssuer")
          .withArgs(hash, caller.address);
      }
    });

    it("rejects revoking the same credential twice", async function () {
      const { registry, university, hash } = await loadFixture(issuedFixture);
      await registry.connect(university).revokeCredential(hash);
      await expect(registry.connect(university).revokeCredential(hash))
        .to.be.revertedWithCustomError(registry, "CredentialAlreadyRevoked")
        .withArgs(hash);
    });

    it("lets a deauthorized issuer still revoke its own credentials", async function () {
      const { registry, university, hash } = await loadFixture(issuedFixture);
      await registry.deauthorizeIssuer(university.address);
      await expect(registry.connect(university).revokeCredential(hash)).to.emit(registry, "CredentialRevoked");
    });
  });

  // ------------------------------------------------------------------
  describe("Gas behaviour", function () {
    it("charges the same gas for the 1st and the 50th registration", async function () {
      const { registry, university } = await loadFixture(deployFixture);
      await registry.authorizeIssuer(university.address);
      const gas = [];
      for (let i = 0; i < 50; i++) {
        const receipt = await (await registry.connect(university).registerCredential(hashOf(`credential-${i}`))).wait();
        gas.push(receipt.gasUsed);
      }
      const spread = gas.reduce((a, b) => (a > b ? a : b)) - gas.reduce((a, b) => (a < b ? a : b));
      expect(spread).to.be.lessThan(100n); // only calldata bytes differ
    });
  });
});
