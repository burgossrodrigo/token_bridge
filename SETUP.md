# Token Bridge — Setup do Ambiente

## Versões confirmadas

| Ferramenta    | Versão                          |
|---------------|---------------------------------|
| node          | 22.x (mínimo)                   |
| npm           | 10.x                            |
| rustc         | 1.92.0 (ded5c06cf 2025-12-08)   |
| cargo         | 1.92.0 (344c4567c 2025-10-21)   |
| solana-cli    | 3.0.15 (Agave)                  |
| anchor-cli    | 0.31.1                          |
| avm           | latest                          |

---

---

## Ethereum

### 1. Node e npm

Use **Node 22** ou superior. Versões anteriores são incompatíveis:

- Node 18 não atende `@solana/codecs-numbers >= 20.18.0` (dependência transitiva do Anchor TS)
- Node 20 funciona para Solana, mas 22 é mais seguro para ambos os lados

```bash
# via nvm (recomendado)
nvm install 22
nvm use 22

node --version   # v22.x.x
npm --version    # 10.x.x
```

### 2. Instalar dependências Ethereum

```bash
npm install
```

> **Atenção — bug NPM #4828:** se o `package-lock.json` foi gerado por uma versão antiga
> do npm, o hardhat falha com `HH18: corrupted lockfile`. Solução: deletar e reinstalar.
> ```bash
> rm package-lock.json && npm install
> ```
> O CI já faz isso automaticamente.

### 3. Compilar contratos

```bash
npx hardhat compile
```

### 4. Rodar testes Ethereum

```bash
npx hardhat test --network hardhat
```

Dependências necessárias além do hardhat:
- `@nomiclabs/hardhat-ethers` — provider ethers.js
- `@nomicfoundation/hardhat-chai-matchers@1` — matchers `.revertedWith()` / `.revertedWithCustomError()` (v1 é a compatível com hardhat v2)

---

## Solana

### 1. Instalar Rust (via rustup)

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

Adicione ao `~/.zshrc` (ou `~/.bashrc`):
```bash
export PATH="$HOME/.cargo/bin:$PATH"
```

### 2. Instalar Solana CLI (Agave)

```bash
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
```

Adicione ao `~/.zshrc`:
```bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
```

Verifique:
```bash
solana --version
```

### 3. Instalar Anchor (via avm)

```bash
cargo install --git https://github.com/coral-xyz/anchor avm --force
avm install 0.31.1
avm use 0.31.1
```

> **Importante:** Use anchor **0.31.1** ou superior.
> anchor 0.30.1 é incompatível com Rust >= 1.92.0 — o tipo `proc_macro::SourceFile`
> foi removido do Rust nightly e o anchor-syn 0.30.1 dependia dele para gerar IDL.

Verifique:
```bash
anchor --version   # anchor-cli 0.31.1
```

---

## 4. Inicializar o projeto Anchor

```bash
cd /caminho/para/token_bridge/contracts
anchor init solana --no-git
cd solana
mv programs/solana programs/bridge
```

Renomeações necessárias após mover a pasta:

**`programs/bridge/Cargo.toml`** — alterar `name`:
```toml
[package]
name = "bridge"

[lib]
name = "bridge"
```

**`Anchor.toml`** — alterar nome do programa:
```toml
[programs.localnet]
bridge = "<program-id>"
```

**`Cargo.toml`** (workspace) — atualizar path e adicionar resolver:
```toml
[workspace]
members = ["programs/bridge"]
resolver = "2"
```

### 5. Corrigir dependências de compatibilidade

O `cargo build-sbf` usa um Cargo bundled (1.84.0) que não suporta `edition2024`.
O `blake3 1.8.3` (dependência transitiva via `anchor-lang → solana-program → blake3`)
introduziu `constant_time_eq 0.4.2` que usa `edition2024`. Fixe para a versão anterior:

```bash
cd contracts/solana
cargo update -p blake3 --precise 1.8.2
```

### 6. Gerar keypair local (necessário para testes)

O `anchor test` usa `~/.config/solana/id.json` como wallet do provider.
Se não existir, o teste falha com `Unable to read keypair file`.

```bash
solana-keygen new --outfile ~/.config/solana/id.json
```

**Keypair deste projeto:**
- pubkey: `3CKhHdio862m2YP8A2uJ3VxgJdFhbbEnphjEzcuRWtc4`

> Em ambiente de desenvolvimento/teste, essa wallet recebe SOL via airdrop automático
> do validator local — não precisa de SOL real.

### 7. Instalar dependências dos testes

```bash
cd contracts/solana
yarn install
```

Dependências necessárias (além do Anchor):
- `@solana/spl-token` — criar mints e token accounts nos testes
- `@solana/web3.js` — tipos e utilitários Solana

### 8. Verificar build e rodar testes

```bash
anchor build
anchor test
```

`anchor test` inicia o validator local, deploya o programa e roda os testes TypeScript.

Warnings sobre `unexpected cfg` (custom-heap, solana, anchor-debug) são normais —
originam de macros internas do Solana/Anchor e não afetam o funcionamento.

---

## Backend

O backend é um serviço Rust em `backend/`. Rust já instalado na etapa anterior.

### 1. Configurar variáveis de ambiente

```bash
cp backend/.env.example backend/.env
```

Edite `backend/.env` com os valores reais:

| Variável | Descrição |
|----------|-----------|
| `ETH_WS_URL` | WebSocket RPC Ethereum (ex: `wss://mainnet.infura.io/ws/v3/...`) |
| `ETH_HTTP_URL` | HTTP RPC Ethereum |
| `ETH_PRIVATE_KEY` | Chave privada da wallet admin ETH (hex sem 0x) |
| `ETH_BRIDGE_ADDRESS` | Endereço do contrato `Bridge.sol` |
| `SOL_WS_URL` | WebSocket RPC Solana (ex: `wss://api.mainnet-beta.solana.com`) |
| `SOL_HTTP_URL` | HTTP RPC Solana |
| `SOL_KEYPAIR_PATH` | Caminho para o keypair JSON do relayer Solana |
| `SOL_PROGRAM_ID` | Program ID do contrato Anchor |
| `DATABASE_URL` | Caminho do SQLite (ex: `sqlite:///data/bridge.db`) |
| `RETRY_INTERVAL_SECS` | Intervalo de retry para eventos pendentes (ex: `60`) |

### 2. Rodar localmente

```bash
cd backend
cargo run
```

### 3. Rodar com Docker

```bash
docker build -t bridge-backend ./backend
docker run -d \
  --env-file backend/.env \
  -v bridge-data:/data \
  bridge-backend
```

O volume `/data` persiste o banco SQLite entre reinicializações.

---

## Imagem Docker de CI — `.github/Dockerfile.ci`

Imagem com Rust 1.92, Solana CLI 2.1, Anchor 0.31.1 e Node 22 pré-instalados. Elimina os ~15 min de setup do CI Solana.

**Publicar no GHCR (rodar uma vez):**

Fazer merge do `Dockerfile.ci` em `main`. O workflow `build-ci-image.yml` publica automaticamente:
```
ghcr.io/burgossrodrigo/anchor-build:0.31.1
```

O job Solana do CI usa `container:` apontando para essa imagem. A partir daí o job faz só:
1. `yarn install`
2. `cargo update` (blake3 + indexmap)
3. `anchor test`

**Atualizar a imagem** quando mudar versão de alguma ferramenta: editar `.github/Dockerfile.ci` e fazer merge em `main`.

---

## Gotchas resolvidos

| Problema | Solução |
|----------|---------|
| `anchor-spl` sem `idl-build` | Adicionar `"anchor-spl/idl-build"` na feature `idl-build` do `Cargo.toml` |
| `AccountInfo` sem `/// CHECK:` | Anchor rejeita — toda `AccountInfo` precisa do comentário explicando a validação manual |
| Warnings `anchor-debug` | Normais — macros internas do Anchor |
| `blake3` edition2024 | `cargo update -p blake3 --precise 1.8.2` |
| Keypair ausente para testes | `solana-keygen new --outfile ~/.config/solana/id.json` |
| Hardhat HH18 lockfile corrompido | `rm package-lock.json && npm install` — bug NPM #4828 |
| Node 18 incompatível com `@solana/codecs-numbers` | Usar Node 22 — a lib exige `>=20.18.0` |
| `expect(...).to.be.reverted` inexistente | Instalar `@nomicfoundation/hardhat-chai-matchers@1` e importar no `hardhat.config.ts` |
| `bytes32` vs `address` para destino cross-chain | Solana pubkeys têm 32 bytes — `address` (20 bytes) não comporta. Usar `bytes32` em `bridgeSent` |
| Comparação de `bytes32` em testes | Eventos retornam hex minúsculo; normalizar com `.toLowerCase()` antes de comparar |
| `BridgeTokenFactory.deployToken` revertia com "no permission" | A factory chama `bridge.addToken()` que exige `onlyAdmin` — adicionar `bridge.setAdmin(factory.address)` no setup do teste |
| `indexmap@2.13.0` incompatível com rustc bundled do Solana (1.79) | `cargo update -p indexmap --precise 2.11.4` — MSRV da 2.11.4 é 1.63; adicionado no CI junto com o fix do blake3 |
| `anchor test` travando no CI por compilação do zero | Cache do `target/` + imagem Docker com Rust/Solana/Anchor pré-instalados. Ver `.github/Dockerfile.ci` e `build-ci-image.yml`. Fazer merge em `main` para publicar `ghcr.io/burgossrodrigo/anchor-build:0.31.1` |
