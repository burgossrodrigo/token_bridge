use anchor_lang::prelude::*;

#[account]
pub struct BridgeConfig {
    pub authority:     Pubkey,
    pub bridge_on:     bool,
    pub bump:          u8,
    /// Monotonic counter used to derive unique event IDs for each bridge_send.
    pub nonce:         u64,
    /// Bridge fee in lamports charged on every bridge_send / claim call.
    /// Mirrors Bridge.sol's currentFee (no surge on SOL side for now —
    /// the coordinator syncs the equivalent value periodically).
    pub fee_lamports:  u64,
}

impl BridgeConfig {
    // 8 discriminator + 32 authority + 1 bridge_on + 1 bump + 8 nonce + 8 fee
    pub const LEN: usize = 8 + 32 + 1 + 1 + 8 + 8;
}
