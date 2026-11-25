require("@nomicfoundation/hardhat-toolbox");
const { vars } = require("hardhat/config");

/**
 * Secrets are read from Hardhat configuration variables, never from the repo:
 *   npx hardhat vars set SEPOLIA_RPC_URL       (e.g. an Infura/Alchemy Sepolia URL)
 *   npx hardhat vars set SEPOLIA_PRIVATE_KEY   (a test wallet holding Sepolia ETH)
 *   npx hardhat vars set ETHERSCAN_API_KEY     (optional, for contract verification)
 * The sepolia network is only defined when both required variables are set.
 */
const networks = {};
if (vars.has("SEPOLIA_RPC_URL") && vars.has("SEPOLIA_PRIVATE_KEY")) {
  networks.sepolia = {
    url: vars.get("SEPOLIA_RPC_URL"),
    accounts: [vars.get("SEPOLIA_PRIVATE_KEY")],
    chainId: 11155111,
  };
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks,
  etherscan: { apiKey: vars.get("ETHERSCAN_API_KEY", "") },
};
