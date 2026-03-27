import styled from 'styled-components'
import { theme } from '../../styles/theme'
import { bp } from '../../styles/breakpoints'

export const HeaderRoot = styled.header`
  position: sticky;
  top: 0;
  z-index: 100;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: ${theme.surface};
  border-bottom: 1px solid ${theme.border};
  flex-shrink: 0;
`

export const LogoSection = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
`

export const LogoIcon = styled.div`
  width: 28px;
  height: 28px;
  background: ${theme.gradient};
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
`

export const LogoName = styled.span`
  font-size: 15px;
  font-weight: 600;
  background: ${theme.gradient};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  white-space: nowrap;

  @media (max-width: ${bp.mobile}) {
    display: none;
  }
`

export const WalletSection = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
`

export const WalletLabel = styled.span`
  font-size: 11px;
  color: ${theme.textMuted};
  white-space: nowrap;

  @media (max-width: ${bp.tablet}) {
    display: none;
  }
`
