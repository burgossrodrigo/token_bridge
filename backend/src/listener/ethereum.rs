use crate::{config::Config, types::{BridgeEvent, Direction, EventStatus}};
use alloy::{
    primitives::Address,
    providers::{ProviderBuilder, WsConnect},
    rpc::types::Filter,
    sol,
    sol_types::SolEvent,
};
use anyhow::Result;
use chrono::Utc;
use std::sync::Arc;
use tokio::sync::mpsc::Sender;
use tracing::{error, info, warn};
use uuid::Uuid;

sol! {
    event TokenSent(address to, address token, uint256 amount);
}

pub async fn run(cfg: Arc<Config>, tx: Sender<BridgeEvent>) {
    loop {
        if let Err(e) = listen(cfg.clone(), tx.clone()).await {
            error!("ETH listener error: {e:#}. Reconnecting in 5s...");
            tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
        }
    }
}

async fn listen(cfg: Arc<Config>, tx: Sender<BridgeEvent>) -> Result<()> {
    info!("ETH listener connecting to {}", cfg.eth_ws_url);

    let ws = WsConnect::new(&cfg.eth_ws_url);
    let provider = ProviderBuilder::new().on_ws(ws).await?;

    let bridge_address: Address = cfg.eth_bridge_address.parse()?;
    let filter = Filter::new()
        .address(bridge_address)
        .event_signature(TokenSent::SIGNATURE_HASH);

    let sub = provider.subscribe_logs(&filter).await?;
    let mut stream = sub.into_stream();

    info!("ETH listener subscribed to TokenSent on {bridge_address}");

    use futures_util::StreamExt;
    while let Some(log) = stream.next().await {
        match TokenSent::decode_log(&log.inner, true) {
            Ok(event) => {
                let source_token = format!("{:?}", event.token).to_lowercase();
                let source_tx = log
                    .transaction_hash
                    .map(|h| format!("{h:?}"))
                    .unwrap_or_default();

                // `to` in ETH event is the Solana destination address (as hex).
                // NOTE: Bridge.sol uses `address` (20 bytes) for `to`, but Solana
                // pubkeys are 32 bytes. This requires Bridge.sol to be updated to
                // use `bytes32` for cross-chain destination addresses.
                let to = format!("{:?}", event.to);
                let amount = event.amount.try_into().unwrap_or(u64::MAX);
                let now = Utc::now().timestamp();

                info!(
                    "ETH TokenSent | token={source_token} amount={amount} to={to} tx={source_tx}"
                );

                let bridge_event = BridgeEvent {
                    id: Uuid::new_v4().to_string(),
                    direction: Direction::EthToSol,
                    source_token: source_token.clone(),
                    dest_token: String::new(), // resolved by worker via DB mapping
                    amount,
                    to,
                    source_tx,
                    status: EventStatus::Pending,
                    retries: 0,
                    created_at: now,
                    updated_at: now,
                };

                if tx.send(bridge_event).await.is_err() {
                    warn!("ETH listener: worker channel closed, stopping");
                    return Ok(());
                }
            }
            Err(e) => {
                error!("ETH listener: failed to decode log: {e}");
            }
        }
    }

    Ok(())
}
