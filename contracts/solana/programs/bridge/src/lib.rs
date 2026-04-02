use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("EX31Vw7MAfF3wfZDXUNzMrBMDiNydgVupaP4dUkzTdSX");

#[program]
pub mod bridge {
    use super::*;

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    /// Deploy bridge state and fee vault. Call once after program deploy.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::initialize(ctx)
    }

    // ── Pair management ───────────────────────────────────────────────────────

    /// Register a (sol_mint, partner_chain) → partner_token bridge pair.
    /// Mirrors Bridge.sol addPair(ethToken, destChainId, destToken).
    pub fn add_pair(
        ctx: Context<AddPair>,
        partner_chain: u64,
        partner_token: [u8; 32],
    ) -> Result<()> {
        instructions::add_pair::add_pair(ctx, partner_chain, partner_token)
    }

    /// Enable or disable an existing bridge pair without deleting it.
    pub fn set_pair_active(ctx: Context<SetPairActive>, active: bool) -> Result<()> {
        instructions::set_pair_active::set_pair_active(ctx, active)
    }

    // ── Bridge operations ─────────────────────────────────────────────────────

    /// Burn SPL tokens, charge SOL fee, emit TokenSent with deterministic event_id.
    /// Coordinator signs destination-chain claim voucher using the event_id.
    pub fn bridge_send(
        ctx: Context<BridgeSend>,
        partner_chain: u64,
        amount: u64,
        to: [u8; 32],
    ) -> Result<()> {
        instructions::bridge_send::bridge_send(ctx, partner_chain, amount, to)
    }

    /// Legacy push-model receive. Kept for backwards compatibility.
    /// In the pull model, users call claim() on the destination chain directly.
    pub fn bridge_receive(ctx: Context<BridgeReceived>, amount: u64, to: Pubkey) -> Result<()> {
        instructions::bridge_received::brige_receive(ctx, amount, to)
    }

    // ── Revenue consolidation ─────────────────────────────────────────────────

    /// Sweep all accumulated SOL fees from the FeeVault to the coordinator
    /// wallet for conversion to ETH and deposit into RevenueVault.sol.
    /// Only callable by the bridge authority (coordinator).
    pub fn withdraw_fees(ctx: Context<WithdrawFees>) -> Result<()> {
        instructions::withdraw_fees::withdraw_fees(ctx)
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    pub fn set_bridge_status(ctx: Context<SetBridgeStatus>, status: bool) -> Result<()> {
        instructions::set_bridge_status::set_bridge_status(ctx, status)
    }

    pub fn set_admin(ctx: Context<SetAdmin>) -> Result<()> {
        instructions::set_admin::set_admin(ctx)
    }

    pub fn remove_admin(ctx: Context<RemoveAdmin>) -> Result<()> {
        instructions::remove_admin::remove_admin(ctx)
    }

    // ── Legacy token whitelist (deprecated — use add_pair instead) ────────────

    pub fn add_token(ctx: Context<AddToken>) -> Result<()> {
        instructions::add_token::add_token(ctx)
    }

    pub fn remove_token(ctx: Context<RemoveToken>) -> Result<()> {
        instructions::remove_token::remove_token(ctx)
    }
}
