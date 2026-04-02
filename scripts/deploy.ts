import hre, { ethers } from "hardhat";

// ── Chain IDs (must match Bridge.sol constants) ───────────────────────────────
const CHAIN_SOLANA = 900n;
// const CHAIN_TRON = 901n;  // uncomment when adding TRON pairs

// ── Configuration — override with env vars in CI/prod ─────────────────────────

// Coordinator Ethereum address (the key that signs claim vouchers).
// In prod: derive from the SSS-reconstructed ETH key.
const COORDINATOR = process.env.COORDINATOR_ETH_ADDRESS
  ?? "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Hardhat account #0

// Project treasury — receives 70 % of bridge fees.
const TREASURY = process.env.TREASURY_ADDRESS
  ?? "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Hardhat account #1

// Initial ETH↔SOL pair (update after Anchor deploy).
// SOL mint pubkey as hex bytes32 (base58 → hex off-chain).
// Example: 13m73hoZaQ9FRuxEdSiZGZ4orrgnkbnt6THXtSnp6GsG
const SOL_MINT_HEX: string | undefined = process.env.SOL_MINT_HEX;

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Network:        ", (await ethers.provider.getNetwork()).name);

  // ── 1. BridgeQuotaNFT ──────────────────────────────────────────────────────
  const NFT = await ethers.getContractFactory("BridgeQuotaNFT");
  const nft = await NFT.deploy();
  await nft.deployed();
  console.log(`\nBridgeQuotaNFT:  ${nft.address}`);

  // ── 2. QuotaSale ──────────────────────────────────────────────────────────
  const Sale = await ethers.getContractFactory("QuotaSale");
  const sale = await Sale.deploy(nft.address);
  await sale.deployed();
  console.log(`QuotaSale:       ${sale.address}`);

  // Allow QuotaSale to mint BFT NFTs.
  await (await nft.setMinter(sale.address)).wait();
  console.log("  → NFT.setMinter(QuotaSale) ✓");

  // ── 3. GasReserve ─────────────────────────────────────────────────────────
  const GasReserve = await ethers.getContractFactory("GasReserve");
  const gasReserve = await GasReserve.deploy(COORDINATOR);
  await gasReserve.deployed();
  console.log(`GasReserve:      ${gasReserve.address}`);

  // ── 4. RevenueVault ───────────────────────────────────────────────────────
  const Vault = await ethers.getContractFactory("RevenueVault");
  const vault = await Vault.deploy(nft.address);
  await vault.deployed();
  console.log(`RevenueVault:    ${vault.address}`);

  // ── 5. Bridge ─────────────────────────────────────────────────────────────
  const Bridge = await ethers.getContractFactory("Bridge");
  const bridge = await Bridge.deploy(
    COORDINATOR,
    vault.address,
    gasReserve.address,
    TREASURY,
  );
  await bridge.deployed();
  console.log(`Bridge:          ${bridge.address}`);

  // ── 6. Deploy MBT token (local dev only) ──────────────────────────────────
  //
  // In prod the tokens already exist; just call bridge.addPair().
  // Here we deploy a minimal ERC-20 for testing.
  const Factory = await ethers.getContractFactory("BridgeTokenFactory");
  const factory = await Factory.deploy(bridge.address);
  await factory.deployed();
  console.log(`\nBridgeTokenFactory: ${factory.address}`);

  const tx = await factory.deployToken(
    "My Bridge Token",
    "MBT",
    18,
    ethers.utils.parseUnits("1000000", 18),
  );
  const receipt = await tx.wait();
  const event = receipt.events?.find((e: any) => e.event === "TokenDeployed");
  const mbtAddress: string = event?.args?.token;
  console.log(`BridgeToken (MBT):  ${mbtAddress}`);

  // ── 7. Register ETH↔SOL pair ──────────────────────────────────────────────
  //
  // destToken = SOL mint pubkey as bytes32.
  // Conversion off-chain:  base58_decode(pubkey).hex().padEnd(64, '0')
  // or using @solana/web3.js: new PublicKey(mintAddr).toBuffer().toString('hex')
  if (SOL_MINT_HEX) {
    const destToken = SOL_MINT_HEX.startsWith("0x")
      ? SOL_MINT_HEX
      : "0x" + SOL_MINT_HEX;

    await (await bridge.addPair(mbtAddress, CHAIN_SOLANA, destToken)).wait();
    console.log(`\n  → bridge.addPair(MBT, Solana=${CHAIN_SOLANA}, ${destToken}) ✓`);
  } else {
    console.log("\n  ⚠  SOL_MINT_HEX not set — ETH↔SOL pair NOT registered.");
    console.log("     After Anchor deploy run:");
    console.log(`     bridge.addPair("${mbtAddress}", ${CHAIN_SOLANA}, "<SOL_MINT_HEX>")`);
  }

  // ── 8. Round 1 of QuotaSale ───────────────────────────────────────────────
  //
  // Round 1: May–June 2026, 1 000 BFTs, $200/quota ($100 ETH + $100 SOL).
  // ethPrice at $2 500/ETH → 0.04 ETH = $100.
  // Update ethPrice via sale.setEthPrice() if ETH/USD drifts significantly.
  const ethPrice    = ethers.utils.parseEther("0.04"); // $100 at $2 500/ETH
  const startTime   = Math.floor(new Date("2026-05-01T00:00:00Z").getTime() / 1000);
  const endTime     = Math.floor(new Date("2026-06-30T23:59:59Z").getTime() / 1000);
  const maxSupply   = 1000;

  await (await sale.addRound(ethPrice, startTime, endTime, maxSupply)).wait();
  console.log(`\n  → QuotaSale.addRound(Round 1: May–Jun 2026, 1000 BFTs) ✓`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEPLOYMENT SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BridgeQuotaNFT   ${nft.address}
QuotaSale        ${sale.address}
GasReserve       ${gasReserve.address}
RevenueVault     ${vault.address}
Bridge           ${bridge.address}
BridgeToken(MBT) ${mbtAddress}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Add to .env:
ETH_BRIDGE_ADDRESS=${bridge.address}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
