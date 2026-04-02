import React from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useAuthContext } from '../../providers'
import {
  HeaderRoot,
  ChainPills,
  ChainPill,
  ConnectPill,
  ChainDot,
  UserArea,
  Avatar,
  AuthButton,
  AuthError,
} from './style'

function shortAddr(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`
}

export function AppHeader() {
  const { publicKey } = useWallet()
  const { isAuthenticated, loading, error, signIn, signOut } = useAuthContext()

  return (
    <HeaderRoot>
      <ChainPills>
        <ConnectButton.Custom>
          {({ account, openConnectModal }) =>
            account ? (
              <ChainPill>
                <ChainDot $color="#627eea" />
                {shortAddr(account.address)}
              </ChainPill>
            ) : (
              <ConnectPill onClick={openConnectModal}>
                <ChainDot $color="#627eea" />
                Connect ETH
              </ConnectPill>
            )
          }
        </ConnectButton.Custom>

        {publicKey ? (
          <ChainPill>
            <ChainDot $color="#9945FF" />
            {shortAddr(publicKey.toBase58())}
          </ChainPill>
        ) : (
          <WalletMultiButton />
        )}
      </ChainPills>

      <UserArea>
        {error && <AuthError>{error}</AuthError>}
        {isAuthenticated ? (
          <>
            <Avatar>
              {publicKey ? publicKey.toBase58().slice(0, 1).toUpperCase() : '?'}
            </Avatar>
            <AuthButton $variant="signout" onClick={signOut}>
              Sign out
            </AuthButton>
          </>
        ) : (
          <AuthButton
            $variant="signin"
            onClick={signIn}
            disabled={loading || !publicKey}
          >
            {loading ? 'Signing…' : 'Sign In'}
          </AuthButton>
        )}
      </UserArea>
    </HeaderRoot>
  )
}
