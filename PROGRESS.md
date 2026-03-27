# Progress — Token Bridge

## Estado geral

Ponte cross-chain Ethereum ↔ Solana. Modelo burn/mint.
- Ethereum: contratos Solidity em `contracts/ethereum/`
- Solana: programa Anchor em `contracts/solana/`
- Backend: serviço Rust em `backend/`

---

## Ethereum — `contracts/ethereum/`

### Contratos
| Arquivo | Responsabilidade | Status |
|---------|-----------------|--------|
| `Admin.sol` | `onlyOwner` / `onlyAdmin` modifiers, `setAdmin`, `removeAdmin` | ✅ |
| `BridgeToken.sol` | ERC20 custom com `ownerMint` / `ownerBurn`, constructor parametrizável | ✅ |
| `Bridge.sol` | `bridgeSent` (burn), `bridgeReceive` (mint), `addToken`, `removeToken` | ✅ |
| `BridgeTokenFactory.sol` | Deploy atômico de BridgeToken + registro no Bridge | ✅ |
| `interface/IBrigeToken.sol` | Interface com `ownerMint` / `ownerBurn` | ✅ |

### Pendências Ethereum
- [ ] `Bridge.addToken` sem controle de acesso — qualquer um pode registrar token
- [ ] `Bridge.bridgeReceive` minta para `msg.sender` em vez de `_to` (bug)
- [ ] Campo `to` em `bridgeSent` e `bridgeReceive` é `address` (20 bytes) — quando o destino é Solana, deveria ser `string` (pubkey base58) ou `bytes32`. `address` não comporta um endereço Solana. Avaliar mudar para `string` para suportar qualquer chain destino, ou `bytes32` para manter eficiência on-chain.
- [ ] Testes Hardhat

---

## Solana — `contracts/solana/`

### Stack
| Ferramenta | Versão |
|-----------|--------|
| rustc | 1.92.0 |
| solana-cli (Agave) | 3.0.15 |
| anchor-cli | 0.31.1 |
| anchor-lang | 0.31.1 |
| anchor-spl | 0.31.1 |

### Program ID
`5vWinfDfVpV4Q6G8a9fmu9HnLQ4GwK3oP5P6ZTLG2qLg`

### State (PDAs)
| Arquivo | Seeds | Status |
|---------|-------|--------|
| `state/bridge_config.rs` | `[b"bridge"]` | ✅ |
| `state/token_config.rs` | `[b"token", mint]` | ✅ |
| `state/admin_config.rs` | `[b"admin", admin_pubkey]` | ✅ |

### Instruções
| Arquivo | Equivalente Solidity | Status |
|---------|---------------------|--------|
| `instructions/initialize.rs` | constructor | ✅ |
| `instructions/add_token.rs` | `addToken()` | ✅ |
| `instructions/remove_token.rs` | `removeToken()` | ✅ |
| `instructions/bridge_send.rs` | `bridgeSent()` — burn SPL | ✅ |
| `instructions/bridge_received.rs` | `bridgeReceive()` — mint SPL via PDA signer | ✅ |
| `instructions/set_bridge_status.rs` | `bridgeStatus()` | ✅ |
| `instructions/set_admin.rs` | `setAdmin()` | ✅ |
| `instructions/remove_admin.rs` | `removeAdmin()` | ✅ |

### Testes — `contracts/solana/tests/bridge.ts`
13/13 passando (`anchor test`). Cobre todos os happy paths + casos de rejeição.

### Pendências Solana
- [ ] `create_token` — instrução para criar SPL Mint + registrar no bridge atomicamente (equivalente da factory ETH)

---

## Backend & Signing Infrastructure

Movido para repositório privado: [burgossrodrigo/token-bridge-signer](https://github.com/burgossrodrigo/token-bridge-signer)

Inclui: relay Rust (listeners + executors + worker + SQLite) + infra Terraform (K8s, VPN, signer pods).

---

## Gotchas resolvidos

| Problema | Solução |
|----------|---------|
| anchor-spl sem `idl-build` | Adicionar `"anchor-spl/idl-build"` na feature `idl-build` do Cargo.toml |
| `AccountInfo` sem `/// CHECK:` | Anchor rejeita — toda AccountInfo precisa do comentário |
| Warnings `anchor-debug` | Normais — macros internas do Anchor |
| `blake3` edition2024 | `cargo update -p blake3 --precise 1.8.2` |
| Keypair ausente para testes | `solana-keygen new --outfile ~/.config/solana/id.json` |
| Hardhat HH18 lockfile corrompido | `rm package-lock.json && npm install` — bug NPM #4828 |
| Node 18 incompatível com `@solana/codecs-numbers` | Usar Node 22 — a lib exige `>=20.18.0` |
| `.to.be.reverted` inexistente no Hardhat | Instalar `@nomicfoundation/hardhat-chai-matchers@1` |
| `bytes32` em testes — comparação falha por casing | Eventos retornam hex minúsculo; usar `.toLowerCase()` antes de comparar |
| `BridgeTokenFactory` revertia em `addToken` | `bridge.setAdmin(factory.address)` no setup — factory precisa ser admin |
| `indexmap@2.13.0` incompatível com rustc bundled Solana (1.79) | `cargo update -p indexmap --precise 2.11.4` |
| `anchor test` travando no CI por compilação do zero | Cache de `target/` + imagem Docker com ferramentas pré-instaladas (`ghcr.io/burgossrodrigo/anchor-build:0.31.1`) |
| Agave 3.x no CI — `io_uring` não suportado | `SOLANA_VERSION=v2.1.21` no `Dockerfile.ci` — Agave 2.x não depende de io_uring |
| `avm install` binário requer GLIBC 2.38/2.39 | `ubuntu:24.04` + `cargo install --git ... anchor-cli --locked` (compila from source) |
| `HOME=/github/home` em containers GitHub Actions | Gerar keypair com `$HOME`, não `/root`; `CARGO_HOME`/`RUSTUP_HOME` explícitos no `env:` do job |
| `program.addEventListener` trava em CI | Substituído por `getTransaction` + parse de logs com `BorshCoder` |
| `getTransaction` retorna `null` logo após `rpc()` | Retry em loop (10x com delay 1s) |
| `program.coder.events.decode` falha em CI | Usar `new BorshCoder(IDL).events` com IDL importado diretamente no teste |

---

## CI — `.github/`

| Arquivo | Responsabilidade | Status |
|---------|-----------------|--------|
| `Dockerfile.ci` | Imagem com Rust 1.92, Agave 2.1.21, Anchor 0.31.1, Node 22 | ✅ publicada em `ghcr.io/burgossrodrigo/anchor-build:0.31.1` |
| `workflows/build-ci-image.yml` | Publica a imagem no GHCR quando `Dockerfile.ci` muda em `main` | ✅ |
| `workflows/integration.yml` | Roda testes Ethereum (Hardhat) + Solana (Anchor) | ⏳ pendente confirmação final |

---

## Próximas tasks

1. Confirmar que CI Solana passa 13/13 com `BorshCoder` fix
2. `create_token` no programa Solana (factory equivalente)
3. Adicionar deps faltando no `backend/Cargo.toml` (`spl-associated-token-account`, `bs58`)
4. CLI ou endpoint para gerenciar `token_mappings`
