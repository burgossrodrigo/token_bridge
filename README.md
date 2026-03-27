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

Solidity contracts using an `Admin` base for access control.

### Contracts

| Contract | Description |
|----------|-------------|
| `Admin.sol` | Base contract — `onlyOwner` / `onlyAdmin` modifiers, `setAdmin`, `removeAdmin` |
| `BridgeToken.sol` | Custom ERC20 with `ownerMint` / `ownerBurn` restricted to the Bridge contract |
| `Bridge.sol` | Core bridge — executes burns and mints, emits events, manages token registry |
| `BridgeTokenFactory.sol` | Atomically deploys a `BridgeToken` + registers it in the Bridge in a single tx |

### Functions

| Function | Access | Solana equivalent | Description |
|----------|--------|------------------|-------------|
| `bridgeSent(token, amount, to)` | anyone | `bridge_send` | Burns tokens on ETH side, emits `TokenSent`. `to` is `bytes32` to support Solana pubkeys |
| `bridgeReceive(token, amount, to)` | admin | `bridge_receive` | Mints tokens on ETH side after detecting a burn on Solana |
| `addToken(token)` | admin | `add_token` | Registers a token as bridgeable |
| `removeToken(token)` | admin | `remove_token` | Removes a token from the registry |
| `bridgeStatus(active)` | owner | `set_bridge_status` | Enables or disables the bridge |
| `deployToken(name, symbol, decimals, maxSupply)` | admin | — | Factory: deploys `BridgeToken` + registers it atomically |

### Events

| Event | Fields |
|-------|--------|
| `TokenSent` | `bytes32 indexed to`, `address indexed token`, `uint256 amount` |
| `TokenReceived` | `address indexed to`, `address indexed token`, `uint256 amount` |

### Tests

```bash
npm install
npx hardhat test
```

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

## Backend & Signing Infrastructure

The relay backend and signing infrastructure are maintained in a private repository.

See [burgossrodrigo/token-bridge-signer](https://github.com/burgossrodrigo/token-bridge-signer).

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

See [burgossrodrigo/token-bridge-signer](https://github.com/burgossrodrigo/token-bridge-signer).
