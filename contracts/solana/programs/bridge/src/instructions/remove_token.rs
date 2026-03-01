use crate::state::{BridgeConfig, TokenConfig};
use anchor_lang::prelude::*;

pub fn remove_token(ctx: Context<RemoveToken>) -> Result<()> {
    ctx.accounts.token_config.bridgeable = false;
    Ok(())
}

#[derive(Accounts)]
pub struct RemoveToken<'info> {
    #[account(
        seeds = [b"bridge"],
       bump = bridge_config.bump,
      has_one = authority @ crate::errors::BridgeError::Unauthorized,
    )]
    pub bridge_config: Account<'info, BridgeConfig>,

    #[account(
        mut,
        seeds = [b"token", mint.key().as_ref()],
        bump = token_config.bump,
    )]
    pub token_config: Account<'info, TokenConfig>,

    pub mint: AccountInfo<'info>,

    pub authority: Signer<'info>,
}
