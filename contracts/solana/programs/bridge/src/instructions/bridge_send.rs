use crate::{
    errors::BridgeError,
    events::TokenSent,
    state::{BridgeConfig, BridgePair},
};
use anchor_lang::{prelude::*, solana_program::keccak};
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount};

/// Burn SPL tokens on Solana and emit TokenSent so the coordinator signs a
/// claim voucher for the destination chain.
///
/// The caller must also attach at least `bridge_config.fee_lamports` SOL.
/// The fee is transferred to the FeeVault PDA. The coordinator periodically
/// sweeps the vault, converts SOL → ETH, and deposits into RevenueVault.sol
/// so ETH NFT holders receive revenue from both chains.
///
/// event_id derivation (coordinator must reproduce exactly):
///   keccak256(900u64_le | nonce_le | sol_mint | amount_le | to)
///   where 900 is the protocol chain ID for Solana.
pub fn bridge_send(
    ctx: Context<BridgeSend>,
    partner_chain: u64,
    amount: u64,
    to: [u8; 32],
) -> Result<()> {
    require!(ctx.accounts.bridge_config.bridge_on, BridgeError::BridgeDisabled);
    require!(ctx.accounts.bridge_pair.active,       BridgeError::TokenNotBridgeable);

    // Charge bridge fee in SOL.
    let fee = ctx.accounts.bridge_config.fee_lamports;
    require!(ctx.accounts.user.lamports() >= fee, BridgeError::InsufficientFee);

    let transfer_fee_ix = anchor_lang::solana_program::system_instruction::transfer(
        ctx.accounts.user.key,
        ctx.accounts.fee_vault.key,
        fee,
    );
    anchor_lang::solana_program::program::invoke(
        &transfer_fee_ix,
        &[
            ctx.accounts.user.to_account_info(),
            ctx.accounts.fee_vault.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    // Derive deterministic event_id.
    let config = &mut ctx.accounts.bridge_config;
    let nonce  = config.nonce;
    config.nonce = nonce.checked_add(1).unwrap();

    const SOL_CHAIN_ID: u64 = 900;
    let event_id = keccak::hashv(&[
        &SOL_CHAIN_ID.to_le_bytes(),
        &nonce.to_le_bytes(),
        ctx.accounts.mint.key().as_ref(),
        &amount.to_le_bytes(),
        &to,
    ])
    .to_bytes();

    // Burn tokens (wrapped-token model — SOL side holds wrapped assets).
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Burn {
            mint:      ctx.accounts.mint.to_account_info(),
            from:      ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    token::burn(cpi_ctx, amount)?;

    emit!(TokenSent {
        event_id,
        partner_chain,
        partner_token: ctx.accounts.bridge_pair.partner_token,
        to,
        sol_mint: ctx.accounts.mint.key(),
        amount,
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(partner_chain: u64)]
pub struct BridgeSend<'info> {
    #[account(
        mut,
        seeds = [b"bridge"],
        bump = bridge_config.bump,
    )]
    pub bridge_config: Account<'info, BridgeConfig>,

    /// Pair PDA: verifies this SPL mint can bridge to `partner_chain`.
    #[account(
        seeds = [
            b"pair",
            mint.key().as_ref(),
            &partner_chain.to_le_bytes(),
        ],
        bump = bridge_pair.bump,
    )]
    pub bridge_pair: Account<'info, BridgePair>,

    /// CHECK: PDA that accumulates fee lamports.
    #[account(mut, seeds = [b"fee_vault"], bump)]
    pub fee_vault: AccountInfo<'info>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(mut, token::mint = mint, token::authority = user)]
    pub token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
