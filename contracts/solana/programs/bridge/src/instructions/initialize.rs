use crate::state::BridgeConfig;
use anchor_lang::prelude::*;

pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    let config = &mut ctx.accounts.bridge_config;
    config.authority = ctx.accounts.authority.key();
    config.bridge_on = true;
    config.bump = ctx.bumps.bridge_config;
    Ok(())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = BridgeConfig::LEN,
        seeds = [b"bridge"],
        bump
    )]
    pub bridge_config: Account<'info, BridgeConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}
