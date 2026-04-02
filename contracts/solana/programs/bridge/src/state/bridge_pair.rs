use anchor_lang::prelude::*;

/// On-chain registry of a bridgeable token pair.
///
/// Seeds: [b"pair", sol_mint.as_ref(), partner_chain_id.to_le_bytes()]
///
/// Mirrors the Bridge.sol `pairs[localToken][destChainId]` mapping.
/// Having the pair on-chain in both programs makes the registry the source of
/// truth — the coordinator's SQLite cache is just a performance optimisation.
///
/// Chain ID convention (same as Bridge.sol):
///   EVM chains → EIP-155 chain ID (1 = ETH mainnet, 56 = BNB …)
///   Solana     → 900  (protocol constant, not EIP-155)
///   TRON       → 901
#[account]
pub struct BridgePair {
    /// Local SPL mint that this pair is for.
    pub sol_mint: Pubkey,

    /// Partner chain identifier (EIP-155 for EVM; 1 = ETH, 56 = BNB, 900 = Solana itself …).
    pub partner_chain: u64,

    /// Token address on the partner chain encoded as 32 bytes.
    ///   EVM address (20 bytes): right-zero-padded  → [addr_bytes | 0x00 * 12]
    ///   Solana pubkey (32 bytes): raw bytes
    pub partner_token: [u8; 32],

    /// Whether the pair is currently accepting transfers.
    pub active: bool,

    pub bump: u8,
}

impl BridgePair {
    // 8 discriminator + 32 mint + 8 chain + 32 partner_token + 1 active + 1 bump
    pub const LEN: usize = 8 + 32 + 8 + 32 + 1 + 1;
}
