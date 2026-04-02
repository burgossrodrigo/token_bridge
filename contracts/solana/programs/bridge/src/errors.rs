use anchor_lang::prelude::*;

#[error_code]
pub enum BridgeError {
    #[msg("Bridge is currently disabled")]
    BridgeDisabled,

    #[msg("No active bridge pair for this token and destination chain")]
    TokenNotBridgeable,

    #[msg("Insufficient token balance")]
    InsufficientBalance,

    #[msg("Unauthorized: caller is not the bridge authority")]
    Unauthorized,

    #[msg("Insufficient SOL fee: attach at least fee_lamports")]
    InsufficientFee,

    #[msg("Fee vault is empty — nothing to withdraw")]
    NothingToWithdraw,
}
