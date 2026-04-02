use crate::state::BridgeConfig;
use anchor_lang::prelude::*;

/// Default fee: ~0.03 SOL in lamports (mirrors Bridge.sol BASE_FEE of 0.03 ETH).
const DEFAULT_FEE_LAMPORTS: u64 = 30_000_000; // 0.03 SOL

pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    let config = &mut ctx.accounts.bridge_config;
    config.authority    = ctx.accounts.authority.key();
    config.bridge_on    = true;
    config.bump         = ctx.bumps.bridge_config;
    config.nonce        = 0;
    config.fee_lamports = DEFAULT_FEE_LAMPORTS;
    Ok(())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = BridgeConfig::LEN,
        seeds = [b"bridge"],
        bump,
    )]
    pub bridge_config: Account<'info, BridgeConfig>,

    /// CHECK: FeeVault is a lamport-only PDA; initialized here with rent-exempt minimum.
    #[account(
        init,
        payer = authority,
        space = 0,
        seeds = [b"fee_vault"],
        bump,
    )]
    pub fee_vault: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}
