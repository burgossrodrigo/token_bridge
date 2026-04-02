import React from 'react'
import type { TxRecord } from '../../types'
import {
  StatusRoot,
  StatusTitle,
  TxList,
  TxRow,
  TxIcon,
  TxInfo,
  TxDirection,
  TxSubtext,
  TxRight,
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
              <TxIcon $direction={tx.direction}>
                {tx.direction === 'eth_to_sol' ? '→' : '←'}
              </TxIcon>
              <TxInfo>
                <TxDirection>
                  {tx.direction === 'eth_to_sol' ? 'Ethereum → Solana' : 'Solana → Ethereum'}
                </TxDirection>
                <TxSubtext>{shortHash(tx.from)}</TxSubtext>
              </TxInfo>
              <TxRight>
                <TxAmount>
                  {tx.amount} {tx.token.symbol}
                </TxAmount>
                <StatusBadge $status={tx.status}>{tx.status}</StatusBadge>
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
              </TxRight>
            </TxRow>
          ))}
        </TxList>
      )}
    </StatusRoot>
  )
}
