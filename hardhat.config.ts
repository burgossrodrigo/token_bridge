import "@nomiclabs/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    goerli: {
      url: process.env.ETH_RPC_URL ?? "",
      accounts: process.env.ETH_PRIVATE_KEY ? [process.env.ETH_PRIVATE_KEY] : [],
    },
    mumbai: {
      url: process.env.POLYGON_RPC_URL ?? "",
      accounts: process.env.ETH_PRIVATE_KEY ? [process.env.ETH_PRIVATE_KEY] : [],
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.7.6",
        settings: {
          optimizer: { enabled: true, runs: 10 },
          metadata: { bytecodeHash: "none" },
        },
      },
    ],
  },
  paths: {
    sources: "./contracts/ethereum",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
};
