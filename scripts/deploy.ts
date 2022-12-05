import hre from 'hardhat'
var Table = require('cli-table3')

async function main(network: any) {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());


  const BridgeToken = await hre.ethers.getContractFactory("BridgeToken")
  const bridgeToken = await BridgeToken.deploy()
  const deployedBridgeToken = await bridgeToken.deployed()

  const Bridge = await hre.ethers.getContractFactory("Bridge")
  const bridge = await Bridge.deploy()
  const deployedBridge = await bridge.deployed()

  await deployedBridge.addToken(deployedBridgeToken.address)

  console.log(`Contract deployed`);
  var table = new Table({
    head: ['Contract', 'Address'],
    style: {
      border: [],
    },
  })
  table.push(['BrigeToken', deployedBridgeToken.address])
  table.push(['Brige', deployedBridge.address])
  console.log(table.toString())
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main('mumbai').catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
