const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const CredentialRegistry = await hre.ethers.getContractFactory("CredentialRegistry");
  const registry = await CredentialRegistry.deploy();
  await registry.waitForDeployment();
  const address = await registry.getAddress();

  console.log("CredentialRegistry deployed to:", address);

  // Share the address + ABI with the web frontend.
  const artifact = await hre.artifacts.readArtifact("CredentialRegistry");
  const out = path.join(__dirname, "..", "frontend", "deployment.json");
  fs.writeFileSync(
    out,
    JSON.stringify({ network: hre.network.name, chainId: Number((await hre.ethers.provider.getNetwork()).chainId), address, abi: artifact.abi }, null, 2)
  );
  console.log("Wrote", path.relative(process.cwd(), out));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
