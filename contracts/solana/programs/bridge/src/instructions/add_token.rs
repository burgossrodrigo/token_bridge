use crate::state::{BridgeConfig, TokenConfig};
use anchor_lang::prelude::*;

pub fn add_token(ctx: Context<AddToken>) -> Result<()> {
    let config = &mut ctx.accounts.token_config;
    config.mint = ctx.accounts.mint.key();
    config.bridgeable = true;
    config.bump = ctx.bumps.token_config;
    Ok(())
}

#[derive(Accounts)]
pub struct AddToken<'info> {
    #[account(
        seeds = [b"bridge"],
        bump = bridge_config.bump,
        has_one = authority @ crate::errors::BridgeError::Unauthorized,
    )]
    pub bridge_config: Account<'info, BridgeConfig>,

    #[account(
        init,
        payer = authority,
        space = TokenConfig::LEN,
        seeds = [b"token", mint.key().as_ref()],
        bump,
    )]
    pub token_config: Account<'info, TokenConfig>,

    /// CHECK
    pub mint: AccountInfo<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
