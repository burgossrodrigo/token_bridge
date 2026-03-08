use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Direction {
    EthToSol,
    SolToEth,
}

impl Direction {
    pub fn as_str(&self) -> &str {
        match self {
            Direction::EthToSol => "eth_to_sol",
            Direction::SolToEth => "sol_to_eth",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "eth_to_sol" => Some(Direction::EthToSol),
            "sol_to_eth" => Some(Direction::SolToEth),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum EventStatus {
    Pending,
    Completed,
    Failed,
}

impl EventStatus {
    pub fn as_str(&self) -> &str {
        match self {
            EventStatus::Pending => "pending",
            EventStatus::Completed => "completed",
            EventStatus::Failed => "failed",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BridgeEvent {
    pub id: String,
    pub direction: Direction,
    /// Token address on the source chain (ETH address or SOL mint pubkey)
    pub source_token: String,
    /// Mapped token address on the destination chain
    pub dest_token: String,
    pub amount: u64,
    /// Destination address on the target chain
    pub to: String,
    /// Source transaction hash or signature
    pub source_tx: String,
    pub status: EventStatus,
    pub retries: i32,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone)]
pub struct TokenMapping {
    /// 0x-prefixed Ethereum token address (lowercase)
    pub eth_token: String,
    /// Base58-encoded Solana mint pubkey
    pub sol_mint: String,
}
