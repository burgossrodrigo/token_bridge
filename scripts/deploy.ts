import hre from "hardhat";
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const Bridge = await ethers.getContractFactory("Bridge");
  const bridge = await Bridge.deploy();
  await bridge.deployed();

  const Factory = await ethers.getContractFactory("BridgeTokenFactory");
  const factory = await Factory.deploy(bridge.address);
  await factory.deployed();

  console.log(`Bridge:             ${bridge.address}`);
  console.log(`BridgeTokenFactory: ${factory.address}`);

  // Example: deploy a bridge token via factory
  const tx = await factory.deployToken(
    "My Bridge Token",
    "MBT",
    18,
    ethers.utils.parseUnits("1000000", 18)
  );
  const receipt = await tx.wait();
  const event = receipt.events?.find((e: any) => e.event === "TokenDeployed");
  console.log(`BridgeToken:        ${event?.args?.token}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
