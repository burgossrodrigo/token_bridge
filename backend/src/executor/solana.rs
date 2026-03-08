use crate::config::Config;
use anyhow::{Context, Result};
use borsh::BorshSerialize;
use sha2::{Digest, Sha256};
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::{read_keypair_file, Signer},
    system_program,
    transaction::Transaction,
};
use spl_token::ID as TOKEN_PROGRAM_ID;
use std::str::FromStr;
use std::sync::Arc;

#[derive(BorshSerialize)]
struct BridgeReceiveArgs {
    amount: u64,
    to: [u8; 32],
}

fn instruction_discriminator(name: &str) -> [u8; 8] {
    let mut hasher = Sha256::new();
    hasher.update(format!("global:{name}").as_bytes());
    let hash = hasher.finalize();
    hash[..8].try_into().unwrap()
}

/// Calls bridge_receive on the Solana bridge program.
///
/// `dest_token` — base58 SPL Mint pubkey
/// `to`         — base58 Solana destination pubkey (token account owner)
/// `amount`     — token amount
pub async fn bridge_receive(
    cfg: Arc<Config>,
    dest_token: &str,
    amount: u64,
    to: &str,
) -> Result<String> {
    let rpc = RpcClient::new_with_commitment(
        cfg.sol_rpc_url.clone(),
        CommitmentConfig::confirmed(),
    );

    let keypair = read_keypair_file(&cfg.sol_keypair_path)
        .map_err(|e| anyhow::anyhow!("Failed to read keypair: {e}"))?;

    let program_id = Pubkey::from_str(&cfg.sol_program_id)?;
    let mint = Pubkey::from_str(dest_token)?;
    let to_pubkey = Pubkey::from_str(to)?;

    // Derive bridge_config PDA
    let (bridge_config_pda, _) =
        Pubkey::find_program_address(&[b"bridge"], &program_id);

    // Derive token_config PDA
    let (token_config_pda, _) =
        Pubkey::find_program_address(&[b"token", mint.as_ref()], &program_id);

    // Derive or find the destination token account
    // The `to` is the owner; the associated token account holds the tokens.
    let token_account =
        spl_associated_token_account::get_associated_token_address(&to_pubkey, &mint);

    // Instruction data: discriminator + borsh(args)
    let discriminator = instruction_discriminator("bridge_receive");
    let args = BridgeReceiveArgs {
        amount,
        to: to_pubkey.to_bytes(),
    };
    let mut data = discriminator.to_vec();
    args.serialize(&mut data)?;

    let accounts = vec![
        AccountMeta::new(bridge_config_pda, false),
        AccountMeta::new_readonly(token_config_pda, false),
        AccountMeta::new(mint, false),
        AccountMeta::new(token_account, false),
        AccountMeta::new(keypair.pubkey(), true), // admin signer
        // admin_config: None — we use the authority path
        AccountMeta::new_readonly(TOKEN_PROGRAM_ID, false),
    ];

    let instruction = Instruction {
        program_id,
        accounts,
        data,
    };

    let recent_blockhash = rpc.get_latest_blockhash().await?;
    let tx = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&keypair.pubkey()),
        &[&keypair],
        recent_blockhash,
    );

    let sig = rpc
        .send_and_confirm_transaction(&tx)
        .await
        .context("bridge_receive transaction failed")?;

    Ok(sig.to_string())
}
