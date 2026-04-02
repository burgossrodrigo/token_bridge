import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = new PublicKey("EX31Vw7MAfF3wfZDXUNzMrBMDiNydgVupaP4dUkzTdSX");
const MINT = new PublicKey("13m73hoZaQ9FRuxEdSiZGZ4orrgnkbnt6THXtSnp6GsG");
const RECIPIENT = new PublicKey("3CKhHdio862m2YP8A2uJ3VxgJdFhbbEnphjEzcuRWtc4");
const TOKEN_ACCOUNT = new PublicKey("FY3sP3NKgNsyaqM9A5kiCQDuybcaeupEqpR18jUMvrAP");

// Coordinator SOL keypair secret (from SSS shares — use local wallet for test)
const walletPath = path.join(process.env.HOME!, ".config/solana/id.json");
const adminKp = Keypair.fromSecretKey(
  Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
);

async function main() {
  const conn = new Connection("http://127.0.0.1:8899", "confirmed");
  const wallet = new anchor.Wallet(adminKp);
  const provider = new anchor.AnchorProvider(conn, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  const idlPath = path.join(
    "/home/rodrigo/code/token_bridge/contracts/solana/target/idl/bridge.json"
  );
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const program = new anchor.Program(idl, provider);

  const [bridgeConfigPda] = PublicKey.findProgramAddressSync([Buffer.from("bridge")], PROGRAM_ID);
  const [tokenConfigPda] = PublicKey.findProgramAddressSync([Buffer.from("token"), MINT.toBuffer()], PROGRAM_ID);
  const [adminConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("admin"), adminKp.publicKey.toBuffer()], PROGRAM_ID
  );

  console.log("Admin pubkey:", adminKp.publicKey.toBase58());
  console.log("BridgeConfig PDA:", bridgeConfigPda.toBase58());
  console.log("TokenConfig PDA:", tokenConfigPda.toBase58());
  console.log("AdminConfig PDA:", adminConfigPda.toBase58());
  console.log("Token account:", TOKEN_ACCOUNT.toBase58());

  // Check if adminConfig exists
  const adminConfigInfo = await conn.getAccountInfo(adminConfigPda);
  console.log("AdminConfig exists:", !!adminConfigInfo, "bytes:", adminConfigInfo?.data.length);

  // Check bridge_config to see who is the authority
  const bridgeConfigInfo = await conn.getAccountInfo(bridgeConfigPda);
  console.log("BridgeConfig exists:", !!bridgeConfigInfo, "bytes:", bridgeConfigInfo?.data.length);

  try {
    const txSig = await (program.methods as any)
      .bridgeReceive(new anchor.BN("100000000000"), RECIPIENT)
      .accounts({
        bridgeConfig: bridgeConfigPda,
        tokenConfig: tokenConfigPda,
        mint: MINT,
        tokenAccount: TOKEN_ACCOUNT,
        admin: adminKp.publicKey,
        adminConfig: adminConfigPda,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([adminKp])
      .rpc();
    console.log("✓ bridge_receive succeeded:", txSig);
  } catch (e: any) {
    console.error("✗ bridge_receive FAILED:", e.message || e);
    if (e.logs) console.error("Logs:", e.logs);
  }
}

main().catch(console.error);
