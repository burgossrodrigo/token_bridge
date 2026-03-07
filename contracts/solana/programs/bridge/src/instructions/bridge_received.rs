use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};

use crate::{
    errors::BridgeError,
    events::TokenReceived,
    state::{AdminConfig, BridgeConfig, TokenConfig},
};

pub fn brige_receive(ctx: Context<BridgeReceived>, amount: u64, to: Pubkey) -> Result<()> {
    require!(
        ctx.accounts.bridge_config.bridge_on,
        BridgeError::BridgeDisabled
    );
    require!(
        ctx.accounts.token_config.bridgeable,
        BridgeError::TokenNotBridgeable
    );

    let is_authority = ctx.accounts.admin.key() == ctx.accounts.bridge_config.authority;
    let is_admin = ctx
        .accounts
        .admin_config
        .as_ref()
        .map(|a| a.is_active)
        .unwrap_or(false);

    require!(is_authority || is_admin, BridgeError::Unauthorized);

    let bump = ctx.accounts.bridge_config.bump;
    let seeds: &[&[u8]] = &[b"bridge", &[bump]];
    let signer_seeds = &[seeds];

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.bridge_config.to_account_info(),
        },
        signer_seeds,
    );

    token::mint_to(cpi_ctx, amount)?;

    emit!(TokenReceived {
        amount,
        to,
        mint: ctx.accounts.mint.key(),
        from: ctx.accounts.admin.key()
    });

    Ok(())
}

#[derive(Accounts)]
pub struct BridgeReceived<'info> {
    #[account(mut, seeds = [b"bridge"], bump = bridge_config.bump)]
    pub bridge_config: Account<'info, BridgeConfig>,

    #[account(seeds = [b"token", mint.key().as_ref()], bump = token_config.bump)]
    pub token_config: Account<'info, TokenConfig>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(mut, token::mint = mint)]
    pub token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(seeds = [b"admin", admin.key().as_ref()], bump)]
    pub admin_config: Option<Account<'info, AdminConfig>>,

    pub token_program: Program<'info, Token>,
}
