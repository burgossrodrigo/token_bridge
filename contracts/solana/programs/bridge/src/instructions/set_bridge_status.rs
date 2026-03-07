use anchor_lang::prelude::*;

use crate::errors::BridgeError;
use crate::state::BridgeConfig;

pub fn set_bridge_status(ctx: Context<SetBridgeStatus>, status: bool) -> Result<()> {
    ctx.accounts.bridge_config.bridge_on = status;
    Ok(())
}

#[derive(Accounts)]
pub struct SetBridgeStatus<'info> {
    #[account(mut, seeds = [b"bridge"], bump = bridge_config.bump, has_one = authority @ BridgeError::Unauthorized)]
    pub bridge_config: Account<'info, BridgeConfig>,

    pub authority: Signer<'info>,
}
