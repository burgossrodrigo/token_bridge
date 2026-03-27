# anchor-build

Pre-built Docker image for running Anchor (Solana) tests on CI without the 20-30 min toolchain setup.

## What's inside

| Tool | Version |
|------|---------|
| Ubuntu | 24.04 |
| Rust | 1.92.0 |
| Solana CLI (Agave) | 2.1.21 |
| Anchor CLI | 0.31.1 |
| Node.js | 22 |
| Yarn | latest |

## Why these choices

**Ubuntu 24.04** — provides GLIBC 2.39, required by the anchor-cli binary. Ubuntu 22.04 (GLIBC 2.35) causes a runtime error when running `anchor`.

**Agave 2.1.21 (not 3.x)** — Agave 3.x requires `io_uring` kernel support, which GitHub Actions runners do not provide. The test validator panics at startup with `assertion failed: io_uring_supported()`. Agave 2.x runs without this requirement.

**anchor-cli compiled from source** — `avm install` downloads a pre-built binary that may require a newer GLIBC than the host provides. Building from source with `cargo install` guarantees compatibility.

## Usage in GitHub Actions

```yaml
jobs:
  solana:
    runs-on: ubuntu-latest
    container:
      image: ghcr.io/burgossrodrigo/anchor-build:0.31.1

    env:
      CARGO_HOME: /root/.cargo
      RUSTUP_HOME: /root/.rustup

    steps:
      - uses: actions/checkout@v4

      - name: Generate keypair
        run: |
          mkdir -p $HOME/.config/solana
          solana-keygen new --outfile $HOME/.config/solana/id.json --no-bip39-passphrase --force

      - name: Fix blake3 compatibility
        working-directory: contracts/solana
        run: cargo update -p blake3 --precise 1.8.2

      - name: Fix indexmap compatibility
        working-directory: contracts/solana
        run: cargo update -p indexmap --precise 2.11.4

      - name: Run tests
        working-directory: contracts/solana
        run: anchor test
```

## Notes

- The `CARGO_HOME`/`RUSTUP_HOME` env vars must be set explicitly — GitHub Actions overrides the container environment and `cargo` will fail without them.
- The keypair must be generated at `$HOME/.config/solana/id.json`. GitHub Actions sets `HOME=/github/home` inside containers, not `/root`.
- `blake3` and `indexmap` pins are required because `cargo build-sbf` uses a bundled Rust (1.79) that is incompatible with their latest versions.
- For event testing with Anchor 0.31.1, use `new BorshCoder(IDL).events.decode` from transaction logs instead of `program.addEventListener` — WebSocket log subscriptions are unreliable in containerized CI.

## Anchor.toml recommendation

```toml
[test]
startup_wait = 60000
```

The test validator takes longer to start in CI runners. 60 seconds is a safe value.
