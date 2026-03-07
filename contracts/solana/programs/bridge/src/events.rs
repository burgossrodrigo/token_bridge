use anchor_lang::prelude::*;

#[event]
pub struct TokenSent {
    pub to: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
}

#[event]
pub struct TokenReceived {
    pub from: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub to: Pubkey,
}

#[event]
pub struct AdminSet {
    pub admin: Pubkey,
}

#[event]
pub struct AdminRemoved {
    pub admin: Pubkey,
}
