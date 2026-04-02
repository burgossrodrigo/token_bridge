use crate::{errors::BridgeError, state::BridgeConfig};
use anchor_lang::prelude::*;

/// Collect the bridge fee (in SOL/lamports) from the user when they call
/// bridge_send or claim on the Solana side.
///
/// This is called internally — the user passes `fee_lamports` and the
/// instruction transfers that amount from their wallet to the FeeVault PDA.
/// The fee amount is read from BridgeConfig.fee_lamports.
///
/// FeeVault seeds: [b"fee_vault"]
/// It is a system-owned PDA (no data), so it accumulates lamports naturally.
/// The coordinator calls withdraw_fees() periodically to sweep it.
pub fn collect_fee(ctx: Context<CollectFee>) -> Result<()> {
    let fee = ctx.accounts.bridge_config.fee_lamports;
    require!(
        ctx.accounts.user.lamports() >= fee,
        BridgeError::InsufficientFee
    );

    // Transfer lamports from user to fee vault via system program CPI.
    let ix = anchor_lang::solana_program::system_instruction::transfer(
        ctx.accounts.user.key,
        ctx.accounts.fee_vault.key,
        fee,
    );
    anchor_lang::solana_program::program::invoke(
        &ix,
        &[
            ctx.accounts.user.to_account_info(),
            ctx.accounts.fee_vault.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    Ok(())
}

#[derive(Accounts)]
pub struct CollectFee<'info> {
    #[account(seeds = [b"bridge"], bump = bridge_config.bump)]
    pub bridge_config: Account<'info, BridgeConfig>,

    /// CHECK: PDA that accumulates fee lamports. No data stored — just a lamport sink.
    #[account(mut, seeds = [b"fee_vault"], bump)]
    pub fee_vault: AccountInfo<'info>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}
