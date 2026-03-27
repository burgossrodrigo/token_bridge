import React, { useMemo } from 'react'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, getDefaultConfig, darkTheme } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { sepolia } from 'wagmi/chains'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { SOL_RPC_URL } from '../constants/tokens'

import '@rainbow-me/rainbowkit/styles.css'
import '@solana/wallet-adapter-react-ui/styles.css'

const wagmiConfig = getDefaultConfig({
  appName: 'Token Bridge',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? 'token-bridge',
  chains: [sepolia],
})

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new CoinbaseWalletAdapter(),
    ],
    []
  )

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#9945FF',
            accentColorForeground: 'white',
            borderRadius: 'medium',
          })}
        >
          <ConnectionProvider endpoint={SOL_RPC_URL}>
            <WalletProvider wallets={wallets} autoConnect>
              <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
          </ConnectionProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
