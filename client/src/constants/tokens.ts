import type { Token } from '../types'

export const TOKENS: Token[] = [
  {
    symbol: 'BTK',
    name: 'Bridge Token',
    ethAddress: import.meta.env.VITE_ETH_BTK_ADDRESS ?? '',
    solMint: import.meta.env.VITE_SOL_BTK_MINT ?? '',
    decimals: 18,
  },
]

export const ETH_BRIDGE_ADDRESS: string =
  import.meta.env.VITE_ETH_BRIDGE_ADDRESS ?? ''

export const SOL_PROGRAM_ID: string =
  import.meta.env.VITE_SOL_PROGRAM_ID ?? '5vWinfDfVpV4Q6G8a9fmu9HnLQ4GwK3oP5P6ZTLG2qLg'

export const SOL_RPC_URL: string =
  import.meta.env.VITE_SOL_RPC_URL ?? 'https://api.devnet.solana.com'
