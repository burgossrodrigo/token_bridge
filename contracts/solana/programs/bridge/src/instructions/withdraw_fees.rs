use crate::{errors::BridgeError, state::BridgeConfig};
use anchor_lang::prelude::*;

/// Withdraw all accumulated fee lamports from the FeeVault to the coordinator
/// wallet. Called periodically by the coordinator backend as part of the
/// SOL→ETH revenue consolidation sweep.
///
/// The coordinator then converts the withdrawn SOL to ETH (via CEX or Circle
/// CCTP) and deposits it into RevenueVault.sol on Ethereum, where ETH NFT
/// holders can claim their proportional share.
///
/// Only the bridge authority (coordinator) can call this.
pub fn withdraw_fees(ctx: Context<WithdrawFees>) -> Result<()> {
    let vault      = &ctx.accounts.fee_vault;
    let recipient  = &ctx.accounts.recipient;
    let rent       = Rent::get()?;

    // Keep the minimum rent-exempt balance so the PDA account stays alive.
    // Transfer everything above that floor to the recipient.
    let min_balance = rent.minimum_balance(0);
    let vault_balance = vault.lamports();

    require!(
        vault_balance > min_balance,
        BridgeError::NothingToWithdraw
    );

    let sweep_amount = vault_balance - min_balance;

    // Decrease vault lamports and increase recipient lamports directly.
    // This is the canonical way to move lamports out of a PDA without CPI
    // (the PDA owns no data so there is no account data to update).
    **vault.try_borrow_mut_lamports()? -= sweep_amount;
    **recipient.try_borrow_mut_lamports()? += sweep_amount;

    Ok(())
}

#[derive(Accounts)]
pub struct WithdrawFees<'info> {
    #[account(
        seeds = [b"bridge"],
        bump = bridge_config.bump,
        has_one = authority @ BridgeError::Unauthorized,
    )]
    pub bridge_config: Account<'info, BridgeConfig>,

    /// CHECK: PDA lamport sink — no data to validate beyond the seeds.
    #[account(mut, seeds = [b"fee_vault"], bump)]
    pub fee_vault: AccountInfo<'info>,

    /// Destination for the swept lamports (coordinator hot wallet).
    /// CHECK: any writable account is a valid recipient.
    #[account(mut)]
    pub recipient: AccountInfo<'info>,

    pub authority: Signer<'info>,
}
