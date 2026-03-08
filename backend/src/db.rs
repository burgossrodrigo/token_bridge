use crate::types::{BridgeEvent, Direction, EventStatus, TokenMapping};
use anyhow::Result;
use sqlx::{Row, SqlitePool};

pub struct Database {
    pool: SqlitePool,
}

impl Database {
    pub async fn connect(url: &str) -> Result<Self> {
        let pool = SqlitePool::connect(url).await?;
        Ok(Self { pool })
    }

    pub async fn migrate(&self) -> Result<()> {
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS bridge_events (
                id          TEXT PRIMARY KEY,
                direction   TEXT NOT NULL,
                source_token TEXT NOT NULL,
                dest_token  TEXT NOT NULL,
                amount      INTEGER NOT NULL,
                to_address  TEXT NOT NULL,
                source_tx   TEXT NOT NULL,
                status      TEXT NOT NULL DEFAULT 'pending',
                retries     INTEGER NOT NULL DEFAULT 0,
                created_at  INTEGER NOT NULL,
                updated_at  INTEGER NOT NULL
            )",
        )
        .execute(&self.pool)
        .await?;

        // Maps ETH token address ↔ SOL mint pubkey
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS token_mappings (
                eth_token   TEXT PRIMARY KEY,
                sol_mint    TEXT NOT NULL UNIQUE
            )",
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Inserts an event. Silently ignores duplicates (idempotent).
    pub async fn insert_event(&self, event: &BridgeEvent) -> Result<()> {
        sqlx::query(
            "INSERT OR IGNORE INTO bridge_events
             (id, direction, source_token, dest_token, amount, to_address,
              source_tx, status, retries, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&event.id)
        .bind(event.direction.as_str())
        .bind(&event.source_token)
        .bind(&event.dest_token)
        .bind(event.amount as i64)
        .bind(&event.to)
        .bind(&event.source_tx)
        .bind(event.status.as_str())
        .bind(event.retries)
        .bind(event.created_at)
        .bind(event.updated_at)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn update_status(
        &self,
        id: &str,
        status: &EventStatus,
        retries: i32,
    ) -> Result<()> {
        let now = chrono::Utc::now().timestamp();
        sqlx::query(
            "UPDATE bridge_events SET status = ?, retries = ?, updated_at = ? WHERE id = ?",
        )
        .bind(status.as_str())
        .bind(retries)
        .bind(now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Returns all pending events that still have retries left.
    pub async fn get_pending_events(&self, max_retries: i32) -> Result<Vec<BridgeEvent>> {
        let rows = sqlx::query(
            "SELECT * FROM bridge_events
             WHERE status = 'pending' AND retries < ?
             ORDER BY created_at ASC",
        )
        .bind(max_retries)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(row_to_event).collect())
    }

    pub async fn get_eth_to_sol_mapping(&self, eth_token: &str) -> Result<Option<String>> {
        let row =
            sqlx::query("SELECT sol_mint FROM token_mappings WHERE eth_token = ?")
                .bind(eth_token)
                .fetch_optional(&self.pool)
                .await?;

        Ok(row.map(|r| r.get("sol_mint")))
    }

    pub async fn get_sol_to_eth_mapping(&self, sol_mint: &str) -> Result<Option<String>> {
        let row =
            sqlx::query("SELECT eth_token FROM token_mappings WHERE sol_mint = ?")
                .bind(sol_mint)
                .fetch_optional(&self.pool)
                .await?;

        Ok(row.map(|r| r.get("eth_token")))
    }

    pub async fn insert_token_mapping(&self, mapping: &TokenMapping) -> Result<()> {
        sqlx::query(
            "INSERT OR REPLACE INTO token_mappings (eth_token, sol_mint) VALUES (?, ?)",
        )
        .bind(&mapping.eth_token)
        .bind(&mapping.sol_mint)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}

fn row_to_event(r: sqlx::sqlite::SqliteRow) -> BridgeEvent {
    let now = chrono::Utc::now().timestamp();
    BridgeEvent {
        id: r.get("id"),
        direction: Direction::from_str(r.get::<&str, _>("direction"))
            .unwrap_or(Direction::EthToSol),
        source_token: r.get("source_token"),
        dest_token: r.get("dest_token"),
        amount: r.get::<i64, _>("amount") as u64,
        to: r.get("to_address"),
        source_tx: r.get("source_tx"),
        status: EventStatus::Pending,
        retries: r.get("retries"),
        created_at: r.get("created_at"),
        updated_at: now,
    }
}
