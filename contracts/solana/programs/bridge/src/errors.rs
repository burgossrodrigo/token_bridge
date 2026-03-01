use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Bridge is current disabled")]
    BridgeDisabled,

    #[msg("Token isn't bridgeable")]
    TokenNotBridgeable,

    #[msg("Insufficient balance")]
    InsufficientBalance,

    #[msg("Unauthorized: caller is not an admin")]
    Unauthorized,
}
