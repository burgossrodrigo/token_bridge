use anchor_lang::prelude::*;

#[account]
pub struct BridgeConfig {
    pub authority: Pubkey,
    pub bridge_on: bool,
    pub bump: u8,
}

impl BridgeConfig {
    pub const LEN: usize = 8 + 32 + 1 + 1;
}
