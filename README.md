# Token Bridge — Ethereum ↔ Solana

A cross-chain burn/mint bridge between Ethereum and Solana. When a token is burned on one side, the equivalent is minted on the other.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Ethereum | Solidity 0.7.6, Hardhat, ethers.js |
| Solana | Anchor 0.31.1, anchor-spl |
| Backend | Rust (tokio), alloy 0.9, solana-client, SQLite |
| CI | GitHub Actions |

---

## Ethereum Contracts — `contracts/ethereum/`

### BridgeToken.sol

A custom ERC20 with two functions restricted to the admin (the Bridge contract):

```solidity
function ownerMint(address to, uint amount) external onlyAdmin returns (bool);
function ownerBurn(address from, uint amount) external onlyAdmin returns (bool);
```

Allows an external contract (Bridge) to control minting and burning without exposing those functions publicly.

### BridgeTokenFactory.sol

Atomically deploys a new `BridgeToken` already registered and ready to use with the bridge:

```solidity
function deployToken(
    string memory name_,
    string memory symbol_,
    uint8 decimals_,
    uint maxSupply_
) external onlyAdmin returns (address);
```

Internally: deploys the `BridgeToken`, sets the Bridge contract as its admin, registers the token as bridgeable, and transfers ownership to the caller. Emits `TokenDeployed`.

### Bridge.sol

Executes the burn/mint and emits events that the backend listens to.

```solidity
// Burns tokens on the ETH side and signals the bridge to mint on the destination.
// _to is bytes32 to support Solana pubkeys (32 bytes).
function bridgeSent(address _token, uint256 _amount, bytes32 _to) external;

// Mints tokens on the ETH side after detecting a burn on the source chain. Admins only.
function bridgeReceive(address _token, uint256 _amount, address _to) external onlyAdmin;
```

Events emitted:

```solidity
event TokenSent(bytes32 indexed to, address indexed token, uint256 amount);
event TokenReceived(address indexed to, address indexed token, uint256 amount);
```

The `to` field in `bridgeSent` is `bytes32` because Solana addresses are 32 bytes — they don't fit in a 20-byte `address`.

Access control:
- `bridgeSent` — any user (whoever holds the token)
- `bridgeReceive`, `addToken`, `removeToken` — admins only
- `bridgeStatus` — owner only

---

## Solana Program — `contracts/solana/`

Anchor program using PDAs for global config, per-token config, and per-admin config.

### PDAs

| Account | Seeds |
|---------|-------|
| `BridgeConfig` | `[b"bridge"]` |
| `TokenConfig` | `[b"token", mint]` |
| `AdminConfig` | `[b"admin", admin_pubkey]` |

### Instructions

| Instruction | ETH equivalent | Description |
|-------------|---------------|-------------|
| `initialize` | constructor | Creates `BridgeConfig`, sets authority |
| `add_token` | `addToken` | Registers an SPL Mint as bridgeable |
| `remove_token` | `removeToken` | Removes a mint from the registry |
| `bridge_send` | `bridgeSent` | Burns SPL tokens + emits `TokenSent` |
| `bridge_receive` | `bridgeReceive` | Mints SPL tokens via PDA signer + emits `TokenReceived` |
| `set_bridge_status` | `bridgeStatus` | Enables or disables the bridge |
| `set_admin` | `setAdmin` | Grants admin role |
| `remove_admin` | `removeAdmin` | Revokes admin role |

`bridge_receive` accepts either the authority (owner) or a registered admin via `AdminConfig`. Minting is done via CPI with the `BridgeConfig` PDA as the signer.

### Tests

```bash
cd contracts/solana
anchor test
```

13 tests covering happy paths, events, and rejection cases (bridge disabled, unauthorized wallet).

---

## Backend — `backend/`

A Rust service that replaces Firebase. Listens for events on both chains and executes the receive instruction on the opposite side.

```
ETH TokenSent ──► listener/ethereum ──► mpsc ──► worker ──► executor/solana ──► bridge_receive (SOL)
SOL TokenSent ──► listener/solana   ──► mpsc ──► worker ──► executor/ethereum ──► bridgeReceive (ETH)
```

- **listener/ethereum** — subscribes to `TokenSent` logs via alloy WebSocket
- **listener/solana** — subscribes to program logs via `PubsubClient`, parses Anchor events (`Program data: <base64>`)
- **worker** — persists events to SQLite, executes, retries automatically every `RETRY_INTERVAL_SECS`
- **executor/ethereum** — calls `bridgeReceive` via alloy
- **executor/solana** — builds the Anchor instruction manually (discriminator + borsh), signs and submits

### Running with Docker

```bash
docker build -t bridge-backend ./backend
docker run -d --env-file backend/.env -v bridge-data:/data bridge-backend
```

Copy `backend/.env.example` to `backend/.env` and fill in the required variables.

---

## CI — GitHub Actions

Two parallel jobs running on every push and PR except to `main` and `dev`:

- **Ethereum** — Node 22, `npm install`, `hardhat compile`, `hardhat test`
- **Solana** — Rust 1.92, Solana CLI 2.1, Anchor 0.31.1, `anchor test`

No secrets required — both environments run locally (hardhat in-process + solana-test-validator).

---

## Running locally

### Ethereum

```bash
npm install
npx hardhat test
```

### Solana

```bash
cd contracts/solana
yarn install
anchor test
```

### Backend

```bash
cp backend/.env.example backend/.env
# fill in the required values
cd backend
cargo run
```
