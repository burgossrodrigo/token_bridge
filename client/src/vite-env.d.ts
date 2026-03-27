/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ETH_CHAIN_ID: string
  readonly VITE_ETH_BRIDGE_ADDRESS: string
  readonly VITE_ETH_BTK_ADDRESS: string
  readonly VITE_WALLETCONNECT_PROJECT_ID: string
  readonly VITE_SOL_RPC_URL: string
  readonly VITE_SOL_PROGRAM_ID: string
  readonly VITE_SOL_BTK_MINT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
