use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("5vWinfDfVpV4Q6G8a9fmu9HnLQ4GwK3oP5P6ZTLG2qLg");

#[program]
pub mod bridge {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::initialize(ctx)
    }

    pub fn add_token(ctx: Context<AddToken>) -> Result<()> {
        instructions::add_token::add_token(ctx)
    }

    pub fn remove_token(ctx: Context<RemoveToken>) -> Result<()> {
        instructions::remove_token::remove_token(ctx)
    }

    pub fn bridge_send(ctx: Context<BridgeSend>, amount: u64, to: Pubkey) -> Result<()> {
        instructions::bridge_send::bridge_send(ctx, amount, to)
    }

    pub fn bridge_receive(ctx: Context<BridgeReceived>, amount: u64, to: Pubkey) -> Result<()> {
        instructions::bridge_received::brige_receive(ctx, amount, to)
    }

    pub fn set_bridge_status(ctx: Context<SetBridgeStatus>, status: bool) -> Result<()> {
        instructions::set_bridge_status::set_bridge_status(ctx, status)
    }
    pub fn set_admin(ctx: Context<SetAdmin>) -> Result<()> {
        instructions::set_admin::set_admin(ctx)
    }
    pub fn remove_admin(ctx: Context<RemoveAdmin>) -> Result<()> {
        instructions::remove_admin::remove_admin(ctx)
    }
}
