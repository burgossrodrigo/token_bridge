use anchor_lang::prelude::*;

use crate::{
    errors::BridgeError,
    events::AdminRemoved,
    state::{AdminConfig, BridgeConfig},
};

pub fn remove_admin(ctx: Context<RemoveAdmin>) -> Result<()> {
    ctx.accounts.admin_config.is_active = false;
    emit!(AdminRemoved {
        admin: ctx.accounts.admin_config.admin
    });
    Ok(())
}

#[derive(Accounts)]
pub struct RemoveAdmin<'info> {
    #[account(seeds = [b"bridge"], bump = bridge_config.bump, has_one = authority @ BridgeError::Unauthorized)]
    pub bridge_config: Account<'info, BridgeConfig>,

    #[account(
        mut,
        seeds = [b"admin", admin_config.admin.as_ref()],
        bump = admin_config.bump,
    )]
    pub admin_config: Account<'info, AdminConfig>,

    pub authority: Signer<'info>,
}
