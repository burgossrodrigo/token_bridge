use crate::{
    config::Config,
    db::Database,
    executor,
    types::{BridgeEvent, Direction, EventStatus},
};
use std::sync::Arc;
use tokio::sync::mpsc::Receiver;
use tracing::{error, info, warn};

/// Receives events from listeners, persists them, and executes bridge_receive
/// on the destination chain. Failed events are retried by the retry task.
pub async fn run(
    mut rx: Receiver<BridgeEvent>,
    cfg: Arc<Config>,
    db: Arc<Database>,
) {
    // Spawn the retry task alongside the main receive loop
    let retry_cfg = cfg.clone();
    let retry_db = db.clone();
    tokio::spawn(async move {
        retry_loop(retry_cfg, retry_db).await;
    });

    while let Some(mut event) = rx.recv().await {
        let cfg = cfg.clone();
        let db = db.clone();

        tokio::spawn(async move {
            process(&mut event, cfg, db).await;
        });
    }

    warn!("Worker channel closed — shutting down");
}

async fn process(event: &mut BridgeEvent, cfg: Arc<Config>, db: Arc<Database>) {
    // Resolve the destination token from the DB mapping
    let dest_token = match resolve_dest_token(event, &db).await {
        Some(t) => t,
        None => {
            error!(
                "No token mapping for {} ({:?}). Dropping event {}.",
                event.source_token, event.direction, event.id
            );
            return;
        }
    };
    event.dest_token = dest_token.clone();

    // Persist before attempting execution (idempotent insert)
    if let Err(e) = db.insert_event(event).await {
        error!("Failed to persist event {}: {e}", event.id);
        return;
    }

    execute(event, &dest_token, &cfg, &db).await;
}

async fn execute(
    event: &BridgeEvent,
    dest_token: &str,
    cfg: &Arc<Config>,
    db: &Arc<Database>,
) {
    info!(
        "Executing bridge_receive | direction={:?} dest_token={dest_token} amount={} to={}",
        event.direction, event.amount, event.to
    );

    let result = match &event.direction {
        Direction::EthToSol => {
            executor::solana::bridge_receive(cfg.clone(), dest_token, event.amount, &event.to)
                .await
        }
        Direction::SolToEth => {
            executor::ethereum::bridge_receive(cfg.clone(), dest_token, event.amount, &event.to)
                .await
        }
    };

    match result {
        Ok(tx) => {
            info!("bridge_receive OK | event={} dest_tx={tx}", event.id);
            let _ = db
                .update_status(&event.id, &EventStatus::Completed, event.retries)
                .await;
        }
        Err(e) => {
            let retries = event.retries + 1;
            error!(
                "bridge_receive FAILED | event={} attempt={retries} error={e:#}",
                event.id
            );
            let status = if retries >= cfg.max_retries {
                warn!("Event {} exhausted retries — marking as failed", event.id);
                EventStatus::Failed
            } else {
                EventStatus::Pending
            };
            let _ = db.update_status(&event.id, &status, retries).await;
        }
    }
}

/// Periodically scans for pending events and re-executes them.
async fn retry_loop(cfg: Arc<Config>, db: Arc<Database>) {
    let interval = tokio::time::Duration::from_secs(cfg.retry_interval_secs);
    loop {
        tokio::time::sleep(interval).await;

        let events = match db.get_pending_events(cfg.max_retries).await {
            Ok(e) => e,
            Err(e) => {
                error!("retry_loop: failed to query pending events: {e}");
                continue;
            }
        };

        if events.is_empty() {
            continue;
        }

        info!("retry_loop: found {} pending event(s)", events.len());

        for event in events {
            let cfg = cfg.clone();
            let db = db.clone();
            tokio::spawn(async move {
                execute(&event, &event.dest_token, &cfg, &db).await;
            });
        }
    }
}

async fn resolve_dest_token(event: &BridgeEvent, db: &Database) -> Option<String> {
    match event.direction {
        Direction::EthToSol => db
            .get_eth_to_sol_mapping(&event.source_token)
            .await
            .ok()
            .flatten(),
        Direction::SolToEth => db
            .get_sol_to_eth_mapping(&event.source_token)
            .await
            .ok()
            .flatten(),
    }
}
