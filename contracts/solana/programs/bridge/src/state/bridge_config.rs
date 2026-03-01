#[account]
pub struct BridgeConfig {
    pub authority: Pubkey,
    pub bridge_on: bool,
    pub bump: u8,
}

impl BridgeConfig {
    pub const LEN: uzise = 8 + 32 + 1 + 1;
}
