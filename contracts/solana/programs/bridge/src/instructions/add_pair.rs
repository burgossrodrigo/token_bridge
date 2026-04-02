use crate::state::{BridgeConfig, BridgePair};
use anchor_lang::prelude::*;

/// Register a new bridge pair: (sol_mint, partner_chain) → partner_token.
///
/// Seeds: [b"pair", sol_mint, partner_chain_id (le bytes)]
/// This mirrors Bridge.sol's `addPair(ethToken, destChainId, destToken)`.
pub fn add_pair(
    ctx: Context<AddPair>,
    partner_chain: u64,
    partner_token: [u8; 32],
) -> Result<()> {
    let pair = &mut ctx.accounts.bridge_pair;
    pair.sol_mint      = ctx.accounts.mint.key();
    pair.partner_chain = partner_chain;
    pair.partner_token = partner_token;
    pair.active        = true;
    pair.bump          = ctx.bumps.bridge_pair;
    Ok(())
}

#[derive(Accounts)]
#[instruction(partner_chain: u64, partner_token: [u8; 32])]
pub struct AddPair<'info> {
    #[account(
        seeds = [b"bridge"],
        bump = bridge_config.bump,
        has_one = authority @ crate::errors::BridgeError::Unauthorized,
    )]
    pub bridge_config: Account<'info, BridgeConfig>,

    #[account(
        init,
        payer = authority,
        space = BridgePair::LEN,
        seeds = [
            b"pair",
            mint.key().as_ref(),
            &partner_chain.to_le_bytes(),
        ],
        bump,
    )]
    pub bridge_pair: Account<'info, BridgePair>,

    /// CHECK: any account is valid as a mint identifier here; caller ensures it is a real SPL mint.
    pub mint: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}
