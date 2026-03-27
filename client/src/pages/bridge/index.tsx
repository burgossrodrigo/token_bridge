import React from 'react'
import { AppHeader } from '../../components/app_header'
import { BridgeCard } from '../../components/bridge_card'
import { TxStatus } from '../../components/tx_status'
import { useBridge } from '../../hooks/useBridge'
import { PageWrapper, Main } from './style'

export function BridgePage() {
  const bridgeState = useBridge()

  return (
    <PageWrapper>
      <AppHeader />
      <Main>
        <BridgeCard {...bridgeState} />
        <TxStatus transactions={bridgeState.txHistory} />
      </Main>
    </PageWrapper>
  )
}
