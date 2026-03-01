use anchor_lang::prelude::*;

#[account]
pub struct TokenConfig {
    pub admin: Pubkey,
    pub bridgeable: bool,
    pub bump: u8,
}

impl TokenConfig {
    pub const LEN: usize = 8 + 32 + 1 + 1;
}
