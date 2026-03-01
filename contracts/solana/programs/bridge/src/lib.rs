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
}
