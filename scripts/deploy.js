const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const EXPLORERS = { 11155111: "https://sepolia.etherscan.io" };

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const { chainId } = await hre.ethers.provider.getNetwork();
  console.log(`Deploying CredentialRegistry to ${hre.network.name} (chainId ${chainId}) from ${deployer.address}`);

  const CredentialRegistry = await hre.ethers.getContractFactory("CredentialRegistry");
  const registry = await CredentialRegistry.deploy();
  const receipt = await registry.deploymentTransaction().wait();
  const address = await registry.getAddress();

  console.log("CredentialRegistry deployed to:", address);
  console.log("Owner (registry admin):", await registry.owner());
  const explorer = EXPLORERS[Number(chainId)];
  if (explorer) console.log("Explorer:", `${explorer}/address/${address}`);

  // Share the address + ABI with the web frontend. blockNumber lets the
  // frontend read the event log without scanning the whole chain.
  const artifact = await hre.artifacts.readArtifact("CredentialRegistry");
  const out = path.join(__dirname, "..", "frontend", "deployment.json");
  fs.writeFileSync(
    out,
    JSON.stringify(
      {
        network: hre.network.name,
        chainId: Number(chainId),
        address,
        deployer: deployer.address,
        blockNumber: receipt.blockNumber,
        abi: artifact.abi,
      },
      null,
      2
    )
  );
  console.log("Wrote", path.relative(process.cwd(), out));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
