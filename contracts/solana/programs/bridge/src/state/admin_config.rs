use anchor_lang::prelude::*;

#[account]
pub struct AdminConfig {
    pub admin: Pubkey,
    pub is_active: bool,
    pub bump: u8,
}

impl AdminConfig {
    pub const LEN: usize = 8 + 32 + 1 + 1;
}
