import { useState, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { useWallet } from '@solana/wallet-adapter-react'
import type { Direction, Token, TxRecord } from '../types'
import { TOKENS } from '../constants/tokens'
import { bridgeSentEth } from '../services/ethereum'
import { bridgeSendSol } from '../services/solana'

interface UseBridgeReturn {
  direction: Direction
  toggleDirection: () => void
  selectedToken: Token | null
  setSelectedToken: (t: Token) => void
  amount: string
  setAmount: (v: string) => void
  loading: boolean
  error: string | null
  txHistory: TxRecord[]
  canBridge: boolean
  bridge: () => Promise<void>
}

export function useBridge(): UseBridgeReturn {
  const { address: ethAddress } = useAccount()
  const solWallet = useWallet()

  const [direction, setDirection] = useState<Direction>('eth_to_sol')
  const [selectedToken, setSelectedToken] = useState<Token | null>(
    TOKENS[0] ?? null
  )
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHistory, setTxHistory] = useState<TxRecord[]>([])

  const toggleDirection = useCallback(() => {
    setDirection((d) => (d === 'eth_to_sol' ? 'sol_to_eth' : 'eth_to_sol'))
    setError(null)
  }, [])

  const canBridge =
    !!selectedToken &&
    !!amount &&
    parseFloat(amount) > 0 &&
    !!ethAddress &&
    !!solWallet.publicKey &&
    !loading

  const bridge = useCallback(async () => {
    if (!canBridge || !selectedToken || !ethAddress || !solWallet.publicKey) return

    setLoading(true)
    setError(null)

    try {
      let hash: string

      if (direction === 'eth_to_sol') {
        hash = await bridgeSentEth(
          selectedToken,
          amount,
          solWallet.publicKey.toBase58(),
          ethAddress
        )
      } else {
        hash = await bridgeSendSol(
          selectedToken,
          amount,
          ethAddress,
          solWallet
        )
      }

      const record: TxRecord = {
        id: crypto.randomUUID(),
        direction,
        token: selectedToken,
        amount,
        from:
          direction === 'eth_to_sol'
            ? ethAddress
            : solWallet.publicKey.toBase58(),
        to:
          direction === 'eth_to_sol'
            ? solWallet.publicKey.toBase58()
            : ethAddress,
        status: 'pending',
        hash,
        timestamp: Date.now(),
      }

      setTxHistory((prev) => [record, ...prev])
      setAmount('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transaction failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [canBridge, direction, selectedToken, amount, ethAddress, solWallet])

  return {
    direction,
    toggleDirection,
    selectedToken,
    setSelectedToken,
    amount,
    setAmount,
    loading,
    error,
    txHistory,
    canBridge,
    bridge,
  }
}
