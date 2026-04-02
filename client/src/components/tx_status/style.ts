import styled from 'styled-components'
import { theme } from '../../styles/theme'
import type { TxStatus } from '../../types'

export const StatusRoot = styled.div`
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const StatusTitle = styled.h3`
  font-size: 10px;
  font-weight: 700;
  color: ${theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 10px;
`

export const TxList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const TxRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 13px;
  background: ${theme.surface};
  border: 1px solid transparent;
  transition: border-color 0.15s;

  &:hover {
    border-color: ${theme.border};
  }
`

export const TxIcon = styled.div<{ $direction: 'eth_to_sol' | 'sol_to_eth' }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${({ $direction }) =>
    $direction === 'eth_to_sol' ? `${theme.teal}20` : `${theme.purple}20`};
  border: 1px solid ${({ $direction }) =>
    $direction === 'eth_to_sol' ? `${theme.teal}40` : `${theme.purple}40`};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
`

export const TxInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
`

export const TxDirection = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${theme.text};
`

export const TxSubtext = styled.span`
  font-size: 11px;
  color: ${theme.textMuted};
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const TxRight = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
`

export const TxAmount = styled.span`
  font-weight: 700;
  font-size: 14px;
  color: ${theme.text};
`

export const TxHash = styled.a`
  font-size: 10px;
  color: ${theme.teal};
  text-decoration: none;
  font-family: monospace;

  &:hover {
    text-decoration: underline;
  }
`

export const StatusBadge = styled.span<{ $status: TxStatus }>`
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 99px;
  font-weight: 600;
  background: ${({ $status }) =>
    $status === 'completed'
      ? `${theme.teal}20`
      : $status === 'failed'
      ? 'rgba(239, 68, 68, 0.15)'
      : 'rgba(245, 158, 11, 0.15)'};
  color: ${({ $status }) =>
    $status === 'completed'
      ? theme.success
      : $status === 'failed'
      ? theme.danger
      : theme.warning};
`

export const EmptyState = styled.p`
  font-size: 13px;
  color: ${theme.textMuted};
  text-align: center;
  padding: 24px 0;
`
