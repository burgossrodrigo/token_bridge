use std::sync::Arc;
use tokio::sync::mpsc;
use tracing::info;

mod config;
mod db;
mod executor;
mod listener;
mod types;
mod worker;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("bridge_backend=info".parse()?),
        )
        .init();

    let cfg = Arc::new(config::Config::from_env()?);
    info!("Config loaded");

    let db = Arc::new(db::Database::connect(&cfg.database_url).await?);
    db.migrate().await?;
    info!("Database ready at {}", cfg.database_url);

    // Channel connecting listeners → worker (buffer 1000 events)
    let (tx, rx) = mpsc::channel::<types::BridgeEvent>(1000);

    // Listeners run in independent tasks — each reconnects on failure
    tokio::spawn(listener::ethereum::run(cfg.clone(), tx.clone()));
    tokio::spawn(listener::solana::run(cfg.clone(), tx.clone()));

    info!("Listeners spawned — bridge running");

    // Worker blocks until channel is closed (never in normal operation)
    worker::run(rx, cfg, db).await;

    Ok(())
}
