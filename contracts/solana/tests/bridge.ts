import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
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

  // payer/authority é a wallet configurada no provider (id.json local)
  const payer = (provider.wallet as any).payer as Keypair;
  const authorityPk = provider.wallet.publicKey;

  // PDAs — derivados uma vez no before()
  let bridgeConfigPda: PublicKey;
  let tokenConfigPda: PublicKey;
  let adminConfigPda: PublicKey;

  // SPL Token
  let mint: PublicKey;
  let userTokenAccount: PublicKey;

  // Admin secundário
  const newAdmin = Keypair.generate();

  before(async () => {
    [bridgeConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("bridge")],
      program.programId
    );
  });

  // ─── initialize ───────────────────────────────────────────────────────────

  it("initialize — cria BridgeConfig com bridge_on = true", async () => {
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
  // Cria o SPL Mint, minta tokens pro usuário e depois transfere
  // a mint_authority para o bridge PDA — simula o deploy de um BridgeToken.

  it("setup: cria mint e transfere authority para o bridge PDA", async () => {
    // Cria mint com authority temporária (payer)
    mint = await createMint(
      provider.connection,
      payer,
      authorityPk, // mint authority temporária
      null,        // freeze authority
      6            // decimais
    );

    // Cria token account para o usuário (authority)
    userTokenAccount = await createAccount(
      provider.connection,
      payer,
      mint,
      authorityPk
    );

    // Minta 1 token (1_000_000 com 6 decimais) enquanto temos authority
    await mintTo(
      provider.connection,
      payer,
      mint,
      userTokenAccount,
      authorityPk,
      1_000_000
    );

    // Passa a mint_authority para o bridge PDA
    await setAuthority(
      provider.connection,
      payer,
      mint,
      authorityPk,
      AuthorityType.MintTokens,
      bridgeConfigPda
    );

    // Deriva o tokenConfig PDA agora que temos o mint
    [tokenConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("token"), mint.toBuffer()],
      program.programId
    );

    const balance = (await getAccount(provider.connection, userTokenAccount)).amount;
    assert.equal(balance, BigInt(1_000_000));
  });

  // ─── add_token ────────────────────────────────────────────────────────────

  it("add_token — registra mint como bridgeável", async () => {
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

  it("set_admin — cria AdminConfig para novo admin", async () => {
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

  it("bridge_send — queima 500_000 tokens do usuário", async () => {
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

  // ─── bridge_receive ───────────────────────────────────────────────────────

  it("bridge_receive via authority — minta 200_000 tokens", async () => {
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
        adminConfig: null, // authority não precisa de adminConfig
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const after = (await getAccount(provider.connection, userTokenAccount)).amount;
    assert.equal(after - before, BigInt(200_000));
  });

  it("bridge_receive via admin — minta 100_000 tokens", async () => {
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
      .signers([newAdmin]) // newAdmin precisa assinar pois não é o provider wallet
      .rpc();

    const after = (await getAccount(provider.connection, userTokenAccount)).amount;
    assert.equal(after - before, BigInt(100_000));
  });

  it("bridge_receive — rejeita carteira não autorizada", async () => {
    const rogue = Keypair.generate();
    // Airdrop mínimo para pagar a tx fee
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
      assert.fail("Deveria ter rejeitado");
    } catch (e: any) {
      assert.include(e.message, "Unauthorized");
    }
  });

  // ─── set_bridge_status ────────────────────────────────────────────────────

  it("set_bridge_status false — desliga a ponte", async () => {
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

  it("bridge_send — rejeita quando ponte está desligada", async () => {
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
      assert.fail("Deveria ter rejeitado");
    } catch (e: any) {
      assert.include(e.message, "BridgeDisabled");
    }
  });

  it("set_bridge_status true — religa a ponte", async () => {
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

  it("remove_token — marca token como não bridgeável", async () => {
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

  it("remove_admin — desativa admin", async () => {
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
