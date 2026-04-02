/**
 * Triggers a SOL→ETH bridge transfer.
 *
 * Calls bridge_send on the Solana bridge program which:
 *  1. Burns the SPL token from the user's ATA
 *  2. Emits TokenSent { to, mint, amount } — coordinator picks this up
 *  3. Coordinator calls bridgeReceive on the ETH Bridge contract
 *
 * The `to` field must be an Ethereum address packed right-aligned into 32 bytes
 * (EVM convention used by the coordinator's ETH executor).
 *
 * Run: npx ts-node scripts/trigger-sol-to-eth.ts
 */
import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID   = new PublicKey("EX31Vw7MAfF3wfZDXUNzMrBMDiNydgVupaP4dUkzTdSX");
const MINT         = new PublicKey("13m73hoZaQ9FRuxEdSiZGZ4orrgnkbnt6THXtSnp6GsG");

// Hardhat test account #0 — receives the tokens on ETH side
const ETH_RECIPIENT = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

// Pack ETH address (20 bytes) right-aligned into 32 bytes (12 zero prefix bytes).
function ethAddressToBytes32(addr: string): PublicKey {
  const stripped = addr.replace(/^0x/, "");
  const padded = "000000000000000000000000" + stripped.toLowerCase();
  return new PublicKey(Buffer.from(padded, "hex"));
}

async function main() {
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");

  const walletPath = path.join(process.env.HOME!, ".config/solana/id.json");
  const walletKp   = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );
  const wallet   = new anchor.Wallet(walletKp);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  const idlPath = path.join(__dirname, "../target/idl/bridge.json");
  const idl     = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const program = new anchor.Program(idl, provider);

  const [bridgeConfigPda] = PublicKey.findProgramAddressSync([Buffer.from("bridge")], PROGRAM_ID);
  const [tokenConfigPda]  = PublicKey.findProgramAddressSync(
    [Buffer.from("token"), MINT.toBuffer()], PROGRAM_ID
  );
  const tokenAccount = getAssociatedTokenAddressSync(MINT, walletKp.publicKey);
  const toBytes32    = ethAddressToBytes32(ETH_RECIPIENT);

  const balance = await connection.getTokenAccountBalance(tokenAccount);
  console.log("Current SOL token balance:", balance.value.uiAmountString);

  // Burn 10 tokens (10 * 10^9 = 10_000_000_000 lamports)
  const amount = new anchor.BN("10000000000");

  console.log("Calling bridge_send...");
  console.log("  User:          ", walletKp.publicKey.toBase58());
  console.log("  Token account: ", tokenAccount.toBase58());
  console.log("  ETH recipient: ", ETH_RECIPIENT);
  console.log("  to (bytes32):  ", toBytes32.toBase58());
  console.log("  Amount:        10 tokens (9 dec)");

  const txSig = await (program.methods as any)
    .bridgeSend(amount, toBytes32)
    .accounts({
      bridgeConfig:  bridgeConfigPda,
      tokenConfig:   tokenConfigPda,
      mint:          MINT,
      tokenAccount:  tokenAccount,
      user:          walletKp.publicKey,
      tokenProgram:  TOKEN_PROGRAM_ID,
    })
    .rpc();

  console.log("\n✓ bridge_send tx:", txSig);
  console.log("  10 tokens burned on Solana");
  console.log("  ETH recipient:", ETH_RECIPIENT);
  console.log("  → Coordinator should now call bridgeReceive on ETH...");
}

main().catch((e) => { console.error(e); process.exit(1); });
