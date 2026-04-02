use crate::state::{BridgeConfig, BridgePair};
use anchor_lang::prelude::*;

/// Enable or disable an existing bridge pair without deleting it.
pub fn set_pair_active(ctx: Context<SetPairActive>, active: bool) -> Result<()> {
    ctx.accounts.bridge_pair.active = active;
    Ok(())
}

#[derive(Accounts)]
pub struct SetPairActive<'info> {
    #[account(
        seeds = [b"bridge"],
        bump = bridge_config.bump,
        has_one = authority @ crate::errors::BridgeError::Unauthorized,
    )]
    pub bridge_config: Account<'info, BridgeConfig>,

    #[account(mut)]
    pub bridge_pair: Account<'info, BridgePair>,

    pub authority: Signer<'info>,
}
