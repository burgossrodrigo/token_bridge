use anyhow::{Context, Result};

#[derive(Debug, Clone)]
pub struct Config {
    // Ethereum
    pub eth_ws_url: String,
    pub eth_rpc_url: String,
    pub eth_bridge_address: String,
    pub eth_private_key: String,

    // Solana
    pub sol_ws_url: String,
    pub sol_rpc_url: String,
    pub sol_program_id: String,
    /// Path to the Solana keypair JSON file used to sign bridge_receive txs
    pub sol_keypair_path: String,
    /// Base58 pubkey of the bridge PDA authority (for deriving accounts)
    pub sol_bridge_config_pda: String,

    // Backend
    pub database_url: String,
    pub max_retries: i32,
    pub retry_interval_secs: u64,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        dotenvy::dotenv().ok();

        Ok(Self {
            eth_ws_url: var("ETH_WS_URL")?,
            eth_rpc_url: var("ETH_RPC_URL")?,
            eth_bridge_address: var("ETH_BRIDGE_ADDRESS")?,
            eth_private_key: var("ETH_PRIVATE_KEY")?,

            sol_ws_url: var("SOL_WS_URL")?,
            sol_rpc_url: var("SOL_RPC_URL")?,
            sol_program_id: var("SOL_PROGRAM_ID")?,
            sol_keypair_path: var("SOL_KEYPAIR_PATH")?,
            sol_bridge_config_pda: var("SOL_BRIDGE_CONFIG_PDA")?,

            database_url: std::env::var("DATABASE_URL")
                .unwrap_or_else(|_| "sqlite:./bridge.db".to_string()),
            max_retries: std::env::var("MAX_RETRIES")
                .unwrap_or_else(|_| "5".to_string())
                .parse()
                .context("MAX_RETRIES must be an integer")?,
            retry_interval_secs: std::env::var("RETRY_INTERVAL_SECS")
                .unwrap_or_else(|_| "30".to_string())
                .parse()
                .context("RETRY_INTERVAL_SECS must be an integer")?,
        })
    }
}

fn var(key: &str) -> Result<String> {
    std::env::var(key).with_context(|| format!("missing env var: {key}"))
}
