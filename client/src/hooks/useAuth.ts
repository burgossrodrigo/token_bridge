import { useState, useCallback, useRef, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import bs58 from 'bs58'
import { requestNonce, verifySignature, refreshTokens } from '../services/auth'
import type { AuthTokens } from '../types'

// access_token TTL is 15 min — refresh 2 min before expiry
const REFRESH_DELAY_MS = 13 * 60 * 1000

interface UseAuthReturn {
  tokens: AuthTokens | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => void
}

export function useAuth(): UseAuthReturn {
  const { publicKey, signMessage, connected } = useWallet()
  const [tokens, setTokens] = useState<AuthTokens | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear session when wallet disconnects
  useEffect(() => {
    if (!connected && tokens) {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      setTokens(null)
    }
  }, [connected]) // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleRefresh = useCallback((tok: AuthTokens) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(async () => {
      try {
        const next = await refreshTokens(tok.refresh_token)
        setTokens(next)
        scheduleRefresh(next)
      } catch {
        // refresh_token expired or revoked — force re-auth
        setTokens(null)
        setError('Session expired — please sign in again')
      }
    }, REFRESH_DELAY_MS)
  }, [])

  const signIn = useCallback(async () => {
    if (!publicKey || !signMessage) {
      setError('Connect your Phantom wallet first')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const pubkey = publicKey.toBase58()
      const nonce = await requestNonce(pubkey)
      const encoded = new TextEncoder().encode(nonce)
      const rawSig = await signMessage(encoded)
      const signature = bs58.encode(rawSig)
      const tok = await verifySignature(pubkey, nonce, signature)
      setTokens(tok)
      scheduleRefresh(tok)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }, [publicKey, signMessage, scheduleRefresh])

  const signOut = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    setTokens(null)
    setError(null)
  }, [])

  return {
    tokens,
    isAuthenticated: !!tokens,
    loading,
    error,
    signIn,
    signOut,
  }
}
