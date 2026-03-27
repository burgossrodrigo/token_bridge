import React from 'react'
import type { TxRecord } from '../../types'
import {
  StatusRoot,
  StatusTitle,
  TxList,
  TxRow,
  TxDirection,
  TxAmount,
  TxHash,
  StatusBadge,
  EmptyState,
} from './style'

interface Props {
  transactions: TxRecord[]
}

function shortHash(hash: string): string {
  if (hash.length <= 12) return hash
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`
}

function directionLabel(dir: TxRecord['direction']): string {
  return dir === 'eth_to_sol' ? 'ETH → SOL' : 'SOL → ETH'
}

export function TxStatus({ transactions }: Props) {
  return (
    <StatusRoot>
      <StatusTitle>Recent Transactions</StatusTitle>

      {transactions.length === 0 ? (
        <EmptyState>No transactions yet</EmptyState>
      ) : (
        <TxList>
          {transactions.map((tx) => (
            <TxRow key={tx.id}>
              <TxDirection>{directionLabel(tx.direction)}</TxDirection>
              <TxAmount>
                {tx.amount} {tx.token.symbol}
              </TxAmount>
              <TxHash
                href={
                  tx.direction === 'eth_to_sol'
                    ? `https://sepolia.etherscan.io/tx/${tx.hash}`
                    : `https://solscan.io/tx/${tx.hash}?cluster=devnet`
                }
                target="_blank"
                rel="noreferrer"
              >
                {shortHash(tx.hash)}
              </TxHash>
              <StatusBadge $status={tx.status}>{tx.status}</StatusBadge>
            </TxRow>
          ))}
        </TxList>
      )}
    </StatusRoot>
  )
}
