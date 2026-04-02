import { ethers } from "hardhat";

// Solana recipient: 3CKhHdio862m2YP8A2uJ3VxgJdFhbbEnphjEzcuRWtc4
// Pre-computed with: node -e "const {PublicKey}=require('@solana/web3.js'); console.log('0x'+Buffer.from(new PublicKey('3CKhHdio862m2YP8A2uJ3VxgJdFhbbEnphjEzcuRWtc4').toBytes()).toString('hex'))"
const SOLANA_RECIPIENT_BYTES32 = "0x209de69b125e445b96cc147357b981765fb6118feba918621a086eff9ce5e4e5";
const SOLANA_RECIPIENT_BASE58  = "3CKhHdio862m2YP8A2uJ3VxgJdFhbbEnphjEzcuRWtc4";

async function main() {
  const [signer] = await ethers.getSigners();

  const bridge = await ethers.getContractAt("Bridge", "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0");
  const token  = await ethers.getContractAt("BridgeToken", "0xd8058efe0198ae9dD7D563e1b4938Dcbc86A1F81");

  // Mint 1000 MBT to the signer so we have tokens to burn
  await (await bridge.bridgeReceive(
    token.address,
    ethers.utils.parseUnits("1000", 18),
    signer.address
  )).wait();
  console.log("Minted 1000 MBT to", signer.address);

  // Approve bridge to burn tokens on our behalf
  await (await token.approve(bridge.address, ethers.constants.MaxUint256)).wait();

  // bridgeSent burns tokens and emits TokenSent — coordinator will pick it up
  const amount = ethers.utils.parseUnits("100", 18);
  const tx = await bridge.bridgeSent(token.address, amount, SOLANA_RECIPIENT_BYTES32);
  await tx.wait();

  console.log("✓ bridgeSent tx:", tx.hash);
  console.log("  Token burned:   100 MBT on ETH");
  console.log("  SOL recipient:", SOLANA_RECIPIENT_BASE58);
  console.log("  → Coordinator should now mint on Solana...");
}

main().catch((e) => { console.error(e); process.exit(1); });
