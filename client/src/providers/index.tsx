import React, { createContext, useContext, useMemo } from 'react'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, getDefaultConfig, darkTheme } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { sepolia } from 'wagmi/chains'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { SOL_RPC_URL } from '../constants/tokens'
import { useAuth } from '../hooks/useAuth'
import type { AuthTokens } from '../types'

import '@rainbow-me/rainbowkit/styles.css'
import '@solana/wallet-adapter-react-ui/styles.css'

interface AuthContextValue {
  tokens: AuthTokens | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within Providers')
  return ctx
}

const wagmiConfig = getDefaultConfig({
  appName: 'Token Bridge',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? 'token-bridge',
  chains: [sepolia],
})

const queryClient = new QueryClient()

function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function Providers({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  )

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#7c5cfc',
            accentColorForeground: 'white',
            borderRadius: 'medium',
          })}
        >
          <ConnectionProvider endpoint={SOL_RPC_URL}>
            <WalletProvider wallets={wallets} autoConnect>
              <WalletModalProvider>
                <AuthProvider>{children}</AuthProvider>
              </WalletModalProvider>
            </WalletProvider>
          </ConnectionProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
