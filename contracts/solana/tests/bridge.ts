import * as anchor from "@coral-xyz/anchor";
import { BN, EventParser, Program } from "@coral-xyz/anchor";
import { Bridge } from "../target/types/bridge";
import {
  AuthorityType,
  TOKEN_PROGRAM_ID,
  createAccount,
  createMint,
  getAccount,
  mintTo,
  setAuthority,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("bridge", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Bridge as Program<Bridge>;

  // payer/authority is the wallet configured in the provider (local id.json)
  const payer = (provider.wallet as any).payer as Keypair;
  const authorityPk = provider.wallet.publicKey;

  // PDAs — derived once in before()
  let bridgeConfigPda: PublicKey;
  let tokenConfigPda: PublicKey;
  let adminConfigPda: PublicKey;

  // SPL Token
  let mint: PublicKey;
  let userTokenAccount: PublicKey;

  // Secondary admin
  const newAdmin = Keypair.generate();

  async function getConfirmedTx(sig: string) {
    for (let i = 0; i < 10; i++) {
      const tx = await provider.connection.getTransaction(sig, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      if (tx) return tx;
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error(`Transaction ${sig} not found after retries`);
  }

  before(async () => {
    [bridgeConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("bridge")],
      program.programId
    );
  });

  // ─── initialize ───────────────────────────────────────────────────────────

  it("initialize — creates BridgeConfig with bridge_on = true", async () => {
    await program.methods
      .initialize()
      .accounts({
        bridgeConfig: bridgeConfigPda,
        authority: authorityPk,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const config = await program.account.bridgeConfig.fetch(bridgeConfigPda);
    assert.isTrue(config.bridgeOn);
    assert.ok(config.authority.equals(authorityPk));
  });

  // ─── setup mint ───────────────────────────────────────────────────────────
  // Creates the SPL Mint, mints tokens to the user, then transfers
  // mint_authority to the bridge PDA — simulates deploying a BridgeToken.

  it("setup: creates mint and transfers authority to bridge PDA", async () => {
    // Create mint with temporary authority (payer)
    mint = await createMint(
      provider.connection,
      payer,
      authorityPk, // temporary mint authority
      null,        // freeze authority
      6            // decimals
    );

    // Create token account for the user (authority)
    userTokenAccount = await createAccount(
      provider.connection,
      payer,
      mint,
      authorityPk
    );

    // Mint 1 token (1_000_000 with 6 decimals) while we still have authority
    await mintTo(
      provider.connection,
      payer,
      mint,
      userTokenAccount,
      authorityPk,
      1_000_000
    );

    // Transfer mint_authority to bridge PDA
    await setAuthority(
      provider.connection,
      payer,
      mint,
      authorityPk,
      AuthorityType.MintTokens,
      bridgeConfigPda
    );

    // Derive tokenConfig PDA now that we have the mint
    [tokenConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("token"), mint.toBuffer()],
      program.programId
    );

    const balance = (await getAccount(provider.connection, userTokenAccount)).amount;
    assert.equal(balance, BigInt(1_000_000));
  });

  // ─── add_token ────────────────────────────────────────────────────────────

  it("add_token — registers mint as bridgeable", async () => {
    await program.methods
      .addToken()
      .accounts({
        bridgeConfig: bridgeConfigPda,
        tokenConfig: tokenConfigPda,
        mint,
        authority: authorityPk,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const tokenConfig = await program.account.tokenConfig.fetch(tokenConfigPda);
    assert.isTrue(tokenConfig.bridgeable);
    assert.ok(tokenConfig.mint.equals(mint));
  });

  // ─── set_admin ────────────────────────────────────────────────────────────

  it("set_admin — creates AdminConfig for new admin", async () => {
    [adminConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("admin"), newAdmin.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .setAdmin()
      .accounts({
        bridgeConfig: bridgeConfigPda,
        adminConfig: adminConfigPda,
        newAdmin: newAdmin.publicKey,
        authority: authorityPk,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const adminConfig = await program.account.adminConfig.fetch(adminConfigPda);
    assert.isTrue(adminConfig.isActive);
    assert.ok(adminConfig.admin.equals(newAdmin.publicKey));
  });

  // ─── bridge_send ──────────────────────────────────────────────────────────

  it("bridge_send — burns 500_000 tokens from user", async () => {
    const before = (await getAccount(provider.connection, userTokenAccount)).amount;
    const destinationOnOtherChain = Keypair.generate().publicKey;

    await program.methods
      .bridgeSend(new BN(500_000), destinationOnOtherChain)
      .accounts({
        bridgeConfig: bridgeConfigPda,
        tokenConfig: tokenConfigPda,
        mint,
        tokenAccount: userTokenAccount,
        user: authorityPk,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const after = (await getAccount(provider.connection, userTokenAccount)).amount;
    assert.equal(before - after, BigInt(500_000));
  });

  it("bridge_send — emits TokenSent event with correct fields", async () => {
    const destinationOnOtherChain = Keypair.generate().publicKey;
    const parser = new EventParser(program.programId, program.coder);

    const sig = await program.methods
      .bridgeSend(new BN(100_000), destinationOnOtherChain)
      .accounts({
        bridgeConfig: bridgeConfigPda,
        tokenConfig: tokenConfigPda,
        mint,
        tokenAccount: userTokenAccount,
        user: authorityPk,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const tx = await getConfirmedTx(sig);
    const events: any[] = [];
    parser.parseLogs(tx.meta.logMessages, (e) => events.push(e));
    const event = events.find((e) => e.name === "TokenSent")?.data;

    assert.ok(event, "TokenSent event not found in logs");
    assert.ok(event.mint.equals(mint), "event.mint mismatch");
    assert.equal(event.amount.toNumber(), 100_000, "event.amount mismatch");
    assert.ok(event.to.equals(destinationOnOtherChain), "event.to mismatch");
  });

  // ─── bridge_receive ───────────────────────────────────────────────────────

  it("bridge_receive via authority — emits TokenReceived event", async () => {
    const originOnOtherChain = Keypair.generate().publicKey;
    const parser = new EventParser(program.programId, program.coder);

    const sig = await program.methods
      .bridgeReceive(new BN(50_000), originOnOtherChain)
      .accounts({
        bridgeConfig: bridgeConfigPda,
        tokenConfig: tokenConfigPda,
        mint,
        tokenAccount: userTokenAccount,
        admin: authorityPk,
        adminConfig: null,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const tx = await getConfirmedTx(sig);
    const events: any[] = [];
    parser.parseLogs(tx.meta.logMessages, (e) => events.push(e));
    const event = events.find((e) => e.name === "TokenReceived")?.data;

    assert.ok(event, "TokenReceived event not found in logs");
    assert.ok(event.mint.equals(mint), "event.mint mismatch");
    assert.equal(event.amount.toNumber(), 50_000, "event.amount mismatch");
  });

  it("bridge_receive via authority — mints 200_000 tokens", async () => {
    const before = (await getAccount(provider.connection, userTokenAccount)).amount;
    const originOnOtherChain = Keypair.generate().publicKey;

    await program.methods
      .bridgeReceive(new BN(200_000), originOnOtherChain)
      .accounts({
        bridgeConfig: bridgeConfigPda,
        tokenConfig: tokenConfigPda,
        mint,
        tokenAccount: userTokenAccount,
        admin: authorityPk,
        adminConfig: null, // authority does not need adminConfig
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const after = (await getAccount(provider.connection, userTokenAccount)).amount;
    assert.equal(after - before, BigInt(200_000));
  });

  it("bridge_receive via admin — mints 100_000 tokens", async () => {
    const before = (await getAccount(provider.connection, userTokenAccount)).amount;
    const originOnOtherChain = Keypair.generate().publicKey;

    await program.methods
      .bridgeReceive(new BN(100_000), originOnOtherChain)
      .accounts({
        bridgeConfig: bridgeConfigPda,
        tokenConfig: tokenConfigPda,
        mint,
        tokenAccount: userTokenAccount,
        admin: newAdmin.publicKey,
        adminConfig: adminConfigPda,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([newAdmin]) // newAdmin must sign since it is not the provider wallet
      .rpc();

    const after = (await getAccount(provider.connection, userTokenAccount)).amount;
    assert.equal(after - before, BigInt(100_000));
  });

  it("bridge_receive — rejects unauthorized wallet", async () => {
    const rogue = Keypair.generate();
    // Airdrop minimum SOL to cover tx fee
    const sig = await provider.connection.requestAirdrop(rogue.publicKey, 1e9);
    await provider.connection.confirmTransaction(sig);

    try {
      await program.methods
        .bridgeReceive(new BN(100_000), Keypair.generate().publicKey)
        .accounts({
          bridgeConfig: bridgeConfigPda,
          tokenConfig: tokenConfigPda,
          mint,
          tokenAccount: userTokenAccount,
          admin: rogue.publicKey,
          adminConfig: null,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([rogue])
        .rpc();
      assert.fail("Should have been rejected");
    } catch (e: any) {
      assert.include(e.message, "Unauthorized");
    }
  });

  // ─── set_bridge_status ────────────────────────────────────────────────────

  it("set_bridge_status false — disables the bridge", async () => {
    await program.methods
      .setBridgeStatus(false)
      .accounts({
        bridgeConfig: bridgeConfigPda,
        authority: authorityPk,
      })
      .rpc();

    const config = await program.account.bridgeConfig.fetch(bridgeConfigPda);
    assert.isFalse(config.bridgeOn);
  });

  it("bridge_send — rejects when bridge is disabled", async () => {
    try {
      await program.methods
        .bridgeSend(new BN(100_000), Keypair.generate().publicKey)
        .accounts({
          bridgeConfig: bridgeConfigPda,
          tokenConfig: tokenConfigPda,
          mint,
          tokenAccount: userTokenAccount,
          user: authorityPk,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      assert.fail("Should have been rejected");
    } catch (e: any) {
      assert.include(e.message, "BridgeDisabled");
    }
  });

  it("set_bridge_status true — re-enables the bridge", async () => {
    await program.methods
      .setBridgeStatus(true)
      .accounts({
        bridgeConfig: bridgeConfigPda,
        authority: authorityPk,
      })
      .rpc();

    const config = await program.account.bridgeConfig.fetch(bridgeConfigPda);
    assert.isTrue(config.bridgeOn);
  });

  // ─── remove_token ─────────────────────────────────────────────────────────

  it("remove_token — marks token as not bridgeable", async () => {
    await program.methods
      .removeToken()
      .accounts({
        bridgeConfig: bridgeConfigPda,
        tokenConfig: tokenConfigPda,
        mint,
        authority: authorityPk,
      })
      .rpc();

    const tokenConfig = await program.account.tokenConfig.fetch(tokenConfigPda);
    assert.isFalse(tokenConfig.bridgeable);
  });

  // ─── remove_admin ─────────────────────────────────────────────────────────

  it("remove_admin — deactivates admin", async () => {
    await program.methods
      .removeAdmin()
      .accounts({
        bridgeConfig: bridgeConfigPda,
        adminConfig: adminConfigPda,
        authority: authorityPk,
      })
      .rpc();

    const adminConfig = await program.account.adminConfig.fetch(adminConfigPda);
    assert.isFalse(adminConfig.isActive);
  });
});
