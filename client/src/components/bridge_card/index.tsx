import React from 'react'
import { useAccount } from 'wagmi'
import { useWallet } from '@solana/wallet-adapter-react'
import { TOKENS } from '../../constants/tokens'
import { TokenSelector } from '../token_selector'
import type { useBridge } from '../../hooks/useBridge'
import {
  CardRoot,
  CardTitle,
  DirectionToggle,
  ChainLabel,
  SwapIcon,
  FieldGroup,
  FieldLabel,
  AmountInput,
  AddressRow,
  AddressLine,
  AddrKey,
  AddrValue,
  NotConnectedHint,
  BridgeButton,
  ErrorMessage,
} from './style'

type BridgeState = ReturnType<typeof useBridge>

interface Props extends BridgeState {}

function shortAddr(addr: string): string {
  if (addr.length <= 16) return addr
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`
}

export function BridgeCard({
  direction,
  toggleDirection,
  selectedToken,
  setSelectedToken,
  amount,
  setAmount,
  loading,
  error,
  canBridge,
  bridge,
}: Props) {
  const { address: ethAddress } = useAccount()
  const { publicKey: solPubkey } = useWallet()

  const isEthToSol = direction === 'eth_to_sol'

  const fromAddr = isEthToSol ? ethAddress : solPubkey?.toBase58()
  const toAddr = isEthToSol ? solPubkey?.toBase58() : ethAddress

  return (
    <CardRoot>
      <CardTitle>Bridge Tokens</CardTitle>

      {/* Direction toggle */}
      <DirectionToggle onClick={toggleDirection} title="Click to swap direction">
        <ChainLabel $chain="eth">Ethereum</ChainLabel>
        <SwapIcon>{isEthToSol ? '→' : '←'}</SwapIcon>
        <ChainLabel $chain="sol">Solana</ChainLabel>
      </DirectionToggle>

      {/* Token selector */}
      <FieldGroup>
        <FieldLabel>Token</FieldLabel>
        <TokenSelector
          tokens={TOKENS}
          selected={selectedToken}
          onChange={setSelectedToken}
        />
      </FieldGroup>

      {/* Amount */}
      <FieldGroup>
        <FieldLabel>Amount</FieldLabel>
        <AmountInput
          type="number"
          placeholder="0.00"
          value={amount}
          min="0"
          step="any"
          onChange={(e) => setAmount(e.target.value)}
        />
      </FieldGroup>

      {/* Addresses */}
      <AddressRow>
        <AddressLine>
          <AddrKey>From</AddrKey>
          {fromAddr ? (
            <AddrValue title={fromAddr}>{shortAddr(fromAddr)}</AddrValue>
          ) : (
            <NotConnectedHint>
              {isEthToSol ? 'Connect ETH wallet' : 'Connect SOL wallet'}
            </NotConnectedHint>
          )}
        </AddressLine>
        <AddressLine>
          <AddrKey>To</AddrKey>
          {toAddr ? (
            <AddrValue title={toAddr}>{shortAddr(toAddr)}</AddrValue>
          ) : (
            <NotConnectedHint>
              {isEthToSol ? 'Connect SOL wallet' : 'Connect ETH wallet'}
            </NotConnectedHint>
          )}
        </AddressLine>
      </AddressRow>

      {/* Error */}
      {error && <ErrorMessage>{error}</ErrorMessage>}

      {/* Submit */}
      <BridgeButton
        onClick={bridge}
        disabled={!canBridge}
        $loading={loading}
      >
        {loading ? 'Bridging…' : 'Bridge Now'}
      </BridgeButton>
    </CardRoot>
  )
}
