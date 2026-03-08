# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM rust:1.92-slim AS builder

RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY Cargo.toml ./
COPY src ./src

RUN cargo build --release

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/bridge-backend /usr/local/bin/bridge-backend

# SQLite database lives in /data — mount a volume here for persistence
VOLUME ["/data"]
ENV DATABASE_URL=sqlite:/data/bridge.db

CMD ["bridge-backend"]
