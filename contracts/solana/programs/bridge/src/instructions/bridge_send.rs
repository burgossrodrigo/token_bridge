use crate::{
    errors::BridgeError,
    events::TokenSent,
    state::{BridgeConfig, TokenConfig},
};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount};

pub fn bridge_send(ctx: Context<BridgeSend>, amount: u64, to: Pubkey) -> Result<()> {
    require!(
        ctx.accounts.bridge_config.bridge_on,
        BridgeError::BridgeDisabled
    );
    require!(
        ctx.accounts.token_config.bridgeable,
        BridgeError::TokenNotBridgeable
    );

    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    token::burn(cpi_ctx, amount)?;

    emit!(TokenSent {
        amount,
        mint: ctx.accounts.mint.key(),
        to
    });

    Ok(())
}

#[derive(Accounts)]
pub struct BridgeSend<'info> {
    #[account(seeds = [b"bridge"], bump = bridge_config.bump)]
    pub bridge_config: Account<'info, BridgeConfig>,

    #[account(seeds = [b"token", mint.key().as_ref()], bump = token_config.bump)]
    pub token_config: Account<'info, TokenConfig>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(mut, token::mint = mint, token::authority = user)]
    pub token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
}
