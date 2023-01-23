import "@nomiclabs/hardhat-ethers";

module.exports = {
  defaultNetwork: "goerli",
  networks: {
    hardhat: {
    },
    goerli: {
      url: "https://eth-goerli.g.alchemy.com/v2/X_71lyvSJ09ASLV4smEvvVs2ZY-vSJ5h",
      accounts: ['PRIVATE_KEY']
    },
    mumbai: {
      url: "https://polygon-mumbai.g.alchemy.com/v2/nRYjkKqGYBrDLnjYwpLsaO4lRgcvJDKy",
      accounts: ['PRIVATE_KEY']
    }    
  },
  solidity: {
    compilers: [
      {
        version: '0.7.6',
        settings: {
          optimizer: {
            enabled: true,
            runs: 10,
          },
          metadata: {
            // do not include the metadata hash, since this is machine dependent
            // and we want all generated code to be deterministic
            // https://docs.soliditylang.org/en/v0.7.6/metadata.html
            bytecodeHash: 'none',
          },
        },
      },
      {
        version: '0.4.18',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ]
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 40000
  }
}
