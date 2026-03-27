# Solana Bridge — Infraestrutura do Programa

## Visão geral

Programa Anchor (Rust) que replica a lógica da ponte Ethereum (`Bridge.sol` + `BridgeToken.sol`)
para Solana, usando SPL Token como padrão de token e PDAs para estado on-chain.

**Modelo de operação:** burn/mint
- Usuário chama `bridge_send` → tokens queimados na origem → evento emitido
- Backend detecta evento → chama `bridge_receive` → tokens cunhados no destino

---

## Localização

```
contracts/
├── ethereum/          # contratos Solidity existentes
└── solana/            # este projeto
    ├── Anchor.toml
    ├── Cargo.toml      # workspace Rust (resolver = "2")
    ├── SETUP.md
    ├── SOLANA_INFRASTRUCTURE.md
    ├── programs/
    │   └── bridge/
    │       ├── Cargo.toml
    │       └── src/
    │           ├── lib.rs                  # entry point do programa
    │           ├── events.rs               # eventos Anchor (#[event])
    │           ├── errors.rs               # erros customizados (#[error_code])
    │           ├── state/
    │           │   ├── mod.rs
    │           │   ├── bridge_config.rs
    │           │   ├── token_config.rs
    │           │   └── admin_config.rs
    │           └── instructions/           # uma instrução por arquivo
    │               ├── mod.rs
    │               └── initialize.rs
    └── tests/
        └── bridge.ts
```

---

## Dependências (`programs/bridge/Cargo.toml`)

```toml
[dependencies]
anchor-lang = "0.31.1"
```

> `blake3` é fixado em `1.8.2` via `cargo update -p blake3 --precise 1.8.2`
> para evitar `constant_time_eq 0.4.x` (edition2024 incompatível com cargo-build-sbf bundled).

---

## Estado on-chain (PDAs)

### `BridgeConfig` — seeds: `[b"bridge"]`

Estado global da ponte.

```rust
pub struct BridgeConfig {
    pub authority: Pubkey,  // dono do programa (equivale a _owner no Solidity)
    pub bridge_on: bool,    // habilita/desabilita a ponte
    pub bump: u8,
}
// LEN = 8 (discriminator) + 32 (Pubkey) + 1 (bool) + 1 (u8) = 42 bytes
```

**Equivalente Solidity:** variáveis `_owner` (Admin.sol) + `bridgeOn` (Bridge.sol)

---

### `TokenConfig` — seeds: `[b"token", mint.key()]`

Estado por token SPL registrado na ponte.

```rust
pub struct TokenConfig {
    pub mint: Pubkey,       // endereço do SPL Mint
    pub bridgeable: bool,   // se o token pode ser bridgeado
    pub bump: u8,
}
// LEN = 8 + 32 + 1 + 1 = 42 bytes
```

**Equivalente Solidity:** `mapping(address => bool) bridgeable` (Bridge.sol)

---

### `AdminConfig` — seeds: `[b"admin", admin_pubkey]`

Estado por admin autorizado.

```rust
pub struct AdminConfig {
    pub admin: Pubkey,   // endereço do admin
    pub is_active: bool, // se o admin está ativo
    pub bump: u8,
}
// LEN = 8 + 32 + 1 + 1 = 42 bytes
```

**Equivalente Solidity:** `mapping(address => bool) admins` (Admin.sol)

---

## Instruções

| Instrução           | Status        | Acesso       | Equivalente Solidity         |
|---------------------|---------------|--------------|------------------------------|
| `initialize`        | ✅ implementada | qualquer   | constructor                  |
| `add_token`         | ✅ implementada | authority    | `addToken(address)`          |
| `remove_token`      | 🔲 pendente   | authority    | `removeToken(address)`       |
| `bridge_send`       | 🔲 pendente   | qualquer     | `bridgeSent(...)`            |
| `bridge_receive`    | 🔲 pendente   | admin        | `bridgeReceive(...)` (admin) |
| `set_bridge_status` | 🔲 pendente   | authority    | `bridgeStatus(bool)`         |
| `set_admin`         | 🔲 pendente   | authority    | `setAdmin(address)`          |
| `remove_admin`      | 🔲 pendente   | authority    | `removeAdmin(address)`       |

### `initialize` ✅ — `contracts/solana/programs/bridge/src/instructions/initialize.rs`

Cria o `BridgeConfig` PDA e registra a authority do programa.

```rust
use anchor_lang::prelude::*;
use crate::state::BridgeConfig;

pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    let config = &mut ctx.accounts.bridge_config;
    config.authority = ctx.accounts.authority.key();
    config.bridge_on = true;
    config.bump = ctx.bumps.bridge_config;
    Ok(())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = BridgeConfig::LEN,
        seeds = [b"bridge"],
        bump
    )]
    pub bridge_config: Account<'info, BridgeConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}
```

### `add_token` ✅ — `contracts/solana/programs/bridge/src/instructions/add_token.rs`

Registra um SPL Mint como bridgeável. Apenas a `authority` pode chamar.

```rust
use crate::state::{BridgeConfig, TokenConfig};
use anchor_lang::prelude::*;

pub fn add_token(ctx: Context<AddToken>) -> Result<()> {
    let config = &mut ctx.accounts.token_config;
    config.mint = ctx.accounts.mint.key();
    config.bridgeable = true;
    config.bump = ctx.bumps.token_config;
    Ok(())
}

#[derive(Accounts)]
pub struct AddToken<'info> {
    #[account(
        seeds = [b"bridge"],
        bump = bridge_config.bump,
        has_one = authority @ crate::errors::BridgeError::Unauthorized,
    )]
    pub bridge_config: Account<'info, BridgeConfig>,

    #[account(
        init,
        payer = authority,
        space = TokenConfig::LEN,
        seeds = [b"token", mint.key().as_ref()],
        bump,
    )]
    pub token_config: Account<'info, TokenConfig>,

    /// CHECK: apenas registramos a pubkey do mint
    pub mint: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}
```

---

## Eventos (`src/events.rs`) ✅

```rust
#[event] pub struct TokenSent     { pub to: Pubkey, pub mint: Pubkey, pub amount: u64 }
#[event] pub struct TokenReceived { pub to: Pubkey, pub mint: Pubkey, pub amount: u64 }
#[event] pub struct AdminSet      { pub admin: Pubkey }
#[event] pub struct AdminRemoved  { pub admin: Pubkey }
```

**Equivalente Solidity:** eventos `TokenSent`, `TokenReceived`, `AdminSet`, `AdminRemoved`

---

## Erros (`src/errors.rs`) ✅

```rust
#[error_code]
pub enum BridgeError {
    #[msg("Bridge is currently disabled")]
    BridgeDisabled,
    #[msg("Token is not registered as bridgeable")]
    TokenNotBridgeable,
    #[msg("Insufficient token balance")]
    InsufficientBalance,
    #[msg("Unauthorized: caller is not an admin")]
    Unauthorized,
}
```

---

## Mapeamento completo Ethereum → Solana

| Conceito Ethereum         | Solana                                 |
|---------------------------|----------------------------------------|
| `contract`                | Anchor `#[program]`                    |
| ERC20 custom              | SPL Token (programa nativo)            |
| `mapping(addr => bool)`   | PDA por chave                          |
| `event`                   | Anchor `#[event]` + `emit!()`          |
| `modifier onlyAdmin`      | verificação de `authority` na conta    |
| `ownerMint / ownerBurn`   | CPI para `spl_token::mint_to / burn`   |
| contrato deployado        | Program ID (keypair em `target/deploy`)|
