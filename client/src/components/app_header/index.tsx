import React from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { HeaderRoot, LogoSection, LogoIcon, LogoName, WalletSection, WalletLabel } from './style'

export function AppHeader() {
  return (
    <HeaderRoot>
      <LogoSection>
        <LogoIcon>⬡</LogoIcon>
        <LogoName>Token Bridge</LogoName>
      </LogoSection>

      <WalletSection>
        <WalletLabel>ETH</WalletLabel>
        <ConnectButton
          chainStatus="icon"
          showBalance={false}
          accountStatus="avatar"
          label="Connect ETH"
        />
        <WalletLabel>SOL</WalletLabel>
        <WalletMultiButton />
      </WalletSection>
    </HeaderRoot>
  )
}
