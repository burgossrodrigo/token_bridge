use anchor_lang::prelude::*;

/// Emitted by bridge_send. The coordinator relays this to the destination chain.
///
/// `event_id` = keccak256(SOL_CHAIN_ID=900, nonce, sol_mint, amount, to)
/// The coordinator uses this as the key when signing the destination-chain
/// claim voucher (e.g., for Bridge.sol's `claimed[eventId]` replay protection).
#[event]
pub struct TokenSent {
    /// Unique identifier for this send event (keccak256-derived, 32 bytes).
    pub event_id: [u8; 32],
    /// Destination chain ID (EIP-155 for EVM chains; 1=ETH, 56=BNB …).
    pub partner_chain: u64,
    /// Token address on the destination chain (bytes32).
    pub partner_token: [u8; 32],
    /// Recipient on the destination chain (bytes32).
    pub to: [u8; 32],
    /// Source SPL mint.
    pub sol_mint: Pubkey,
    pub amount: u64,
}

/// Emitted by bridge_receive (legacy push model — kept for compatibility).
#[event]
pub struct TokenReceived {
    pub from:   Pubkey,
    pub mint:   Pubkey,
    pub amount: u64,
    pub to:     Pubkey,
}

#[event]
pub struct AdminSet {
    pub admin: Pubkey,
}

#[event]
pub struct AdminRemoved {
    pub admin: Pubkey,
}
