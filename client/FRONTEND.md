# Token Bridge — Frontend

Interface web para a ponte cross-chain Ethereum ↔ Solana.

---

## Stack

| Camada | Biblioteca |
|--------|-----------|
| Build | Vite 5 + TypeScript |
| UI | React 18 + styled-components v6 |
| ETH wallet | wagmi v2 + RainbowKit v2 + viem |
| SOL wallet | @solana/wallet-adapter-react-ui |
| SOL SDK | @coral-xyz/anchor + @solana/web3.js + @solana/spl-token |

Design segue a paleta Solana: roxo `#9945FF` e verde `#14F195`.

---

## Setup

```bash
cp .env.example .env   # preencher endereços dos contratos
npm install --legacy-peer-deps
npm run dev            # http://localhost:5173
npm run build          # produção em dist/
```

### Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `VITE_ETH_BRIDGE_ADDRESS` | Endereço do `Bridge.sol` deployado |
| `VITE_ETH_BTK_ADDRESS` | Endereço do `BridgeToken` no Ethereum |
| `VITE_WALLETCONNECT_PROJECT_ID` | Project ID do WalletConnect (cloud.walletconnect.com) |
| `VITE_SOL_RPC_URL` | RPC Solana (default: devnet) |
| `VITE_SOL_PROGRAM_ID` | Program ID do bridge Anchor |
| `VITE_SOL_BTK_MINT` | Mint address do token SPL correspondente |

---

## Estrutura

```
client/
├── index.html                    ← entry point Vite
├── vite.config.ts                ← node polyfills (Buffer, crypto, stream)
├── .env.example
└── src/
    ├── index.tsx                 ← ReactDOM.createRoot
    ├── App.tsx                   ← providers + router
    ├── vite-env.d.ts             ← tipos das env vars
    │
    ├── types/index.ts            ← Direction, Token, TxRecord, TxStatus
    ├── constants/tokens.ts       ← TOKENS[], ETH_BRIDGE_ADDRESS, SOL_PROGRAM_ID
    │
    ├── styles/
    │   ├── theme.ts              ← palette Solana (bg, primary, accent, etc.)
    │   ├── breakpoints.ts        ← tablet (960px), mobile (600px)
    │   └── global.ts             ← GlobalStyle (reset + override wallet adapter)
    │
    ├── providers/index.tsx       ← Wagmi + RainbowKit + Solana WalletAdapter
    │
    ├── hooks/
    │   └── useBridge.ts          ← toda a lógica de estado da ponte
    │
    ├── services/
    │   ├── ethereum.ts           ← bridgeSentEth: approve + bridgeSent via viem
    │   └── solana.ts             ← bridgeSendSol: ATA + bridge_send via Anchor
    │
    ├── components/
    │   ├── shared/
    │   │   ├── horizontal_div/style.ts   ← flex row, space-between
    │   │   └── vertical_div/style.ts     ← flex column, center
    │   │
    │   ├── app_header/
    │   │   ├── index.tsx         ← logo + ConnectButton (ETH) + WalletMultiButton (SOL)
    │   │   └── style.ts
    │   │
    │   ├── token_selector/
    │   │   ├── index.tsx         ← dropdown controlado, fecha ao clicar fora
    │   │   └── style.ts
    │   │
    │   ├── bridge_card/
    │   │   ├── index.tsx         ← formulário principal da ponte
    │   │   └── style.ts
    │   │
    │   └── tx_status/
    │       ├── index.tsx         ← lista de transações recentes com badge de status
    │       └── style.ts
    │
    └── pages/
        └── bridge/
            ├── index.tsx         ← BridgePage: compõe Header + BridgeCard + TxStatus
            └── style.ts          ← PageWrapper + Main
```

---

## Arquitetura: Pages > Components

Mesma convenção do projeto:

- **Pages** compõem components e definem o layout de tela (`min-height: 100vh`, padding)
- **Components** são isolados — não importam estilos de página
- `style.ts` por componente — never cross-import

---

## Fluxo de uso

### ETH → SOL

1. Usuário conecta carteira Ethereum (MetaMask / WalletConnect) via RainbowKit
2. Usuário conecta carteira Solana (Phantom / Solflare) via WalletMultiButton
3. Seleciona token e amount
4. `useBridge` chama `bridgeSentEth`:
   - Verifica allowance do ERC20 → aprova se insuficiente
   - Chama `Bridge.bridgeSent(token, amount, solanaPubkeyAsBytes32)`
5. Hash aparece no `TxStatus` com status `pending`
6. Backend detecta o evento e executa `bridge_receive` no Solana

### SOL → ETH

1. Mesmo fluxo de conexão
2. `useBridge` chama `bridgeSendSol`:
   - Cria ATA do usuário se não existir
   - Chama `bridge_send(amount, ethAddressAsPubkey)` via Anchor SDK
3. Hash aparece no `TxStatus`
4. Backend detecta e executa `bridgeReceive` no Ethereum

---

## `useBridge` — hook central

```ts
const {
  direction,       // 'eth_to_sol' | 'sol_to_eth'
  toggleDirection, // inverte a direção
  selectedToken,   // Token | null
  setSelectedToken,
  amount,          // string
  setAmount,
  loading,         // boolean — desabilita o botão
  error,           // string | null
  txHistory,       // TxRecord[] — persiste na sessão (memória local)
  canBridge,       // boolean — todos os campos válidos + wallets conectadas
  bridge,          // () => Promise<void>
} = useBridge()
```

`canBridge` é `true` somente quando:
- Token selecionado
- Amount > 0
- Wallet ETH conectada
- Wallet SOL conectada
- Não está em loading

---

## Adicionando tokens

Editar `src/constants/tokens.ts`:

```ts
export const TOKENS: Token[] = [
  {
    symbol: 'BTK',
    name: 'Bridge Token',
    ethAddress: import.meta.env.VITE_ETH_BTK_ADDRESS,
    solMint: import.meta.env.VITE_SOL_BTK_MINT,
    decimals: 18,
  },
  // adicionar aqui...
]
```

Cada token precisa de um par `ethAddress` ↔ `solMint` registrado no backend (`token_mappings` SQLite).

---

## Gotchas

| Problema | Solução aplicada |
|----------|-----------------|
| `@solana/web3.js` precisa de `Buffer`, `crypto`, `stream` no browser | `vite-plugin-node-polyfills` no `vite.config.ts` |
| react-scripts não suporta polyfills sem eject | Migrado para Vite |
| `BackpackWalletAdapter` não existe em `@solana/wallet-adapter-wallets` | Substituído por `CoinbaseWalletAdapter` |
| `import.meta.env` sem tipos | `src/vite-env.d.ts` com `ImportMetaEnv` |
| Peer dep conflict entre RainbowKit e @tanstack/react-query | `npm install --legacy-peer-deps` |
| SOL pubkey (32 bytes) como `bytes32` no ETH | Decode base58 manual em `ethereum.ts` → `0x` hex 64 chars |
| ETH address (20 bytes) como `pubkey` no SOL | Zero-pad p/ 32 bytes em `solana.ts` → `new PublicKey(bytes)` |
