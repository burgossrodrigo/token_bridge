use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod state;

declare_id!("5vWinfDfVpV4Q6G8a9fmu9HnLQ4GwK3oP5P6ZTLG2qLg");

#[program]
pub mod solana {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
