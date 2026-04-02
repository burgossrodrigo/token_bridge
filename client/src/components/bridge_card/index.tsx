import React from 'react'
import { useAccount } from 'wagmi'
import { useWallet } from '@solana/wallet-adapter-react'
import { TOKENS } from '../../constants/tokens'
import { TokenSelector } from '../token_selector'
import type { useBridge } from '../../hooks/useBridge'
import {
  CardRoot,
  BalanceSection,
  BalanceLabel,
  BalanceAmount,
  AccentBars,
  AccentBar,
  AccentBarTrack,
  AssetCard,
  AssetCardHeader,
  AssetCardTitle,
  AssetCardActions,
  AssetCardBtn,
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
import { theme } from '../../styles/theme'

type BridgeState = ReturnType<typeof useBridge>

function shortAddr(addr: string): string {
  if (addr.length <= 16) return addr
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`
}

export function BridgeCard({
  selectedToken,
  setSelectedToken,
  amount,
  setAmount,
  loading,
  error,
  canBridge,
  bridge,
}: BridgeState) {
  const { address: ethAddress } = useAccount()
  const { publicKey: solPubkey } = useWallet()

  return (
    <CardRoot>
      <BalanceSection>
        <BalanceLabel>Bridge Amount</BalanceLabel>
        <BalanceAmount>{amount ? `${amount} ${selectedToken?.symbol ?? ''}` : '0.00'}</BalanceAmount>
        <AccentBars>
          <AccentBar $color={theme.teal} $flex={3} />
          <AccentBar $color={theme.purple} $flex={2} />
          <AccentBar $color={theme.pink} $flex={1} />
          <AccentBarTrack />
        </AccentBars>
      </BalanceSection>

      <AssetCard>
        <AssetCardHeader>
          <AssetCardTitle>Token & Amount</AssetCardTitle>
          <AssetCardActions>
            <AssetCardBtn title="Add token">+</AssetCardBtn>
            <AssetCardBtn title="More">•••</AssetCardBtn>
          </AssetCardActions>
        </AssetCardHeader>

        <FieldGroup>
          <FieldLabel>Token</FieldLabel>
          <TokenSelector
            tokens={TOKENS}
            selected={selectedToken}
            onChange={setSelectedToken}
          />
        </FieldGroup>

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
      </AssetCard>

      <AddressRow>
        <AddressLine>
          <AddrKey>From</AddrKey>
          {ethAddress ? (
            <AddrValue title={ethAddress}>{shortAddr(ethAddress)}</AddrValue>
          ) : (
            <NotConnectedHint>Connect ETH wallet</NotConnectedHint>
          )}
        </AddressLine>
        <AddressLine>
          <AddrKey>To</AddrKey>
          {solPubkey ? (
            <AddrValue title={solPubkey.toBase58()}>{shortAddr(solPubkey.toBase58())}</AddrValue>
          ) : (
            <NotConnectedHint>Connect SOL wallet</NotConnectedHint>
          )}
        </AddressLine>
      </AddressRow>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <BridgeButton onClick={bridge} disabled={!canBridge} $loading={loading}>
        {loading ? 'Bridging…' : 'Bridge Now'}
      </BridgeButton>
    </CardRoot>
  )
}
