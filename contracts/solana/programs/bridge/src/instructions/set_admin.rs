use anchor_lang::prelude::*;

use crate::{
    errors::BridgeError,
    events::AdminSet,
    state::{AdminConfig, BridgeConfig},
};

pub fn set_admin(ctx: Context<SetAdmin>) -> Result<()> {
    let admin_config = &mut ctx.accounts.admin_config;
    admin_config.admin = ctx.accounts.new_admin.key();
    admin_config.is_active = true;
    admin_config.bump = ctx.bumps.admin_config;

    emit!(AdminSet {
        admin: ctx.accounts.new_admin.key()
    });
    Ok(())
}

#[derive(Accounts)]
pub struct SetAdmin<'info> {
    #[account(seeds = [b"bridge"], bump = bridge_config.bump, has_one = authority @ BridgeError::Unauthorized)]
    pub bridge_config: Account<'info, BridgeConfig>,

    #[account(
        init,
        payer = authority,
        space = AdminConfig::LEN,
        seeds = [b"admin", new_admin.key().as_ref()],
        bump,
    )]
    pub admin_config: Account<'info, AdminConfig>,

    /// CHECK: only register the pubkey from new admin, without read from the account
    pub new_admin: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}
