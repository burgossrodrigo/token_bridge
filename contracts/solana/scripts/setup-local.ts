/**
 * Local E2E setup script.
 *
 * 1. Initializes the bridge program (creates BridgeConfig PDA)
 * 2. Creates a new SPL mint and transfers mint authority to the bridge PDA
 * 3. Registers the mint as bridgeable (add_token)
 * 4. Prints all addresses needed for .env
 *
 * Run: npx ts-node scripts/setup-local.ts
 */
import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import {
  createMint,
  getMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = new PublicKey("EX31Vw7MAfF3wfZDXUNzMrBMDiNydgVupaP4dUkzTdSX");
const RPC_URL = "http://127.0.0.1:8899";

async function main() {
  const connection = new Connection(RPC_URL, "confirmed");

  // Load local wallet
  const walletPath = path.join(
    process.env.HOME!,
    ".config/solana/id.json"
  );
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );
  const wallet = new anchor.Wallet(walletKeypair);

  // Load IDL
  const idlPath = path.join(__dirname, "../target/idl/bridge.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));

  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  const program = new anchor.Program(idl, provider);

  // Derive bridge_config PDA
  const [bridgeConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("bridge")],
    PROGRAM_ID
  );

  console.log("=== Local Bridge Setup ===");
  console.log("Program ID:       ", PROGRAM_ID.toBase58());
  console.log("Authority:        ", walletKeypair.publicKey.toBase58());
  console.log("BridgeConfig PDA: ", bridgeConfigPda.toBase58());

  // 1. Initialize bridge
  try {
    await (program.methods as any)
      .initialize()
      .accounts({
        bridgeConfig: bridgeConfigPda,
        authority: walletKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("\n[1] Bridge initialized ✓");
  } catch (e: any) {
    if (e.message?.includes("already in use")) {
      console.log("\n[1] Bridge already initialized — skipping");
    } else {
      throw e;
    }
  }

  // 2. Create SPL mint — bridge PDA will be mint authority so it can mint via CPI
  const mint = await createMint(
    connection,
    walletKeypair,          // payer
    bridgeConfigPda,        // mint authority = bridge PDA (required for bridge_receive)
    null,                   // freeze authority
    9,                      // decimals
    undefined,
    { commitment: "confirmed" },
    TOKEN_PROGRAM_ID
  );
  console.log("[2] SPL Mint created:", mint.toBase58());
  console.log("    Mint authority:  ", bridgeConfigPda.toBase58(), "(bridge PDA)");

  // 3. Derive token_config PDA and register mint
  const [tokenConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("token"), mint.toBuffer()],
    PROGRAM_ID
  );

  await (program.methods as any)
    .addToken()
    .accounts({
      bridgeConfig: bridgeConfigPda,
      tokenConfig: tokenConfigPda,
      mint: mint,
      authority: walletKeypair.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log("[3] Token registered as bridgeable ✓");
  console.log("    TokenConfig PDA:", tokenConfigPda.toBase58());

  // Summary for .env
  console.log("\n=== Paste into .env ===");
  console.log(`SOL_PROGRAM_ID=${PROGRAM_ID.toBase58()}`);
  console.log(`SOL_BRIDGE_CONFIG_PDA=${bridgeConfigPda.toBase58()}`);
  console.log(`SOL_MINT=${mint.toBase58()}`);
  console.log(`ETH_BRIDGE_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`);
  console.log(`ETH_TOKEN_ADDRESS=0xd8058efe0198ae9dD7D563e1b4938Dcbc86A1F81`);

  console.log("\n=== Token mapping (insert into SQLite) ===");
  console.log(
    `sqlite3 /tmp/bridge-local.db "INSERT INTO token_mappings (eth_token, sol_mint) VALUES ('0xd8058efe0198ae9dd7d563e1b4938dcbc86a1f81', '${mint.toBase58()}');"`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
