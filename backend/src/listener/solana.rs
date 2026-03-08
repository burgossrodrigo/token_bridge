use crate::{config::Config, types::{BridgeEvent, Direction, EventStatus}};
use anyhow::Result;
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use borsh::BorshDeserialize;
use chrono::Utc;
use sha2::{Digest, Sha256};
use solana_client::{
    nonblocking::pubsub_client::PubsubClient,
    rpc_config::{RpcTransactionLogsConfig, RpcTransactionLogsFilter},
};
use solana_sdk::commitment_config::CommitmentConfig;
use std::sync::Arc;
use tokio::sync::mpsc::Sender;
use tracing::{error, info, warn};
use uuid::Uuid;
use futures_util::StreamExt;

/// Anchor event: TokenSent { to: Pubkey, mint: Pubkey, amount: u64 }
#[derive(BorshDeserialize, Debug)]
struct TokenSentEvent {
    to: [u8; 32],
    mint: [u8; 32],
    amount: u64,
}

fn event_discriminator(name: &str) -> [u8; 8] {
    let mut hasher = Sha256::new();
    hasher.update(format!("event:{name}").as_bytes());
    let hash = hasher.finalize();
    hash[..8].try_into().unwrap()
}

pub async fn run(cfg: Arc<Config>, tx: Sender<BridgeEvent>) {
    let discriminator = event_discriminator("TokenSent");
    loop {
        if let Err(e) = listen(cfg.clone(), tx.clone(), &discriminator).await {
            error!("SOL listener error: {e:#}. Reconnecting in 5s...");
            tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
        }
    }
}

async fn listen(
    cfg: Arc<Config>,
    tx: Sender<BridgeEvent>,
    discriminator: &[u8; 8],
) -> Result<()> {
    info!("SOL listener connecting to {}", cfg.sol_ws_url);

    let pubsub = PubsubClient::new(&cfg.sol_ws_url).await?;

    let (mut stream, _unsub) = pubsub
        .logs_subscribe(
            RpcTransactionLogsFilter::Mentions(vec![cfg.sol_program_id.clone()]),
            RpcTransactionLogsConfig {
                commitment: Some(CommitmentConfig::confirmed()),
            },
        )
        .await?;

    info!("SOL listener subscribed to program {}", cfg.sol_program_id);

    while let Some(response) = stream.next().await {
        let logs = &response.value.logs;
        let signature = &response.value.signature;

        if let Some(event) = parse_token_sent(logs, discriminator) {
            let mint = bs58::encode(&event.mint).into_string();
            let to = bs58::encode(&event.to).into_string();
            let now = Utc::now().timestamp();

            info!(
                "SOL TokenSent | mint={mint} amount={} to={to} sig={signature}",
                event.amount
            );

            let bridge_event = BridgeEvent {
                id: Uuid::new_v4().to_string(),
                direction: Direction::SolToEth,
                source_token: mint,
                dest_token: String::new(), // resolved by worker via DB mapping
                amount: event.amount,
                to,
                source_tx: signature.clone(),
                status: EventStatus::Pending,
                retries: 0,
                created_at: now,
                updated_at: now,
            };

            if tx.send(bridge_event).await.is_err() {
                warn!("SOL listener: worker channel closed, stopping");
                return Ok(());
            }
        }
    }

    Ok(())
}

/// Scans program logs for an Anchor "Program data: <base64>" entry
/// matching the TokenSent discriminator, and deserializes the event.
fn parse_token_sent(logs: &[String], discriminator: &[u8; 8]) -> Option<TokenSentEvent> {
    for log in logs {
        let encoded = log.strip_prefix("Program data: ")?;
        let data = B64.decode(encoded).ok()?;

        if data.len() < 8 {
            continue;
        }

        if &data[..8] != discriminator {
            continue;
        }

        return TokenSentEvent::deserialize(&mut &data[8..]).ok();
    }
    None
}
