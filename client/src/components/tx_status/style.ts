import styled from 'styled-components'
import { theme } from '../../styles/theme'
import type { TxStatus } from '../../types'

export const StatusRoot = styled.div`
  width: 100%;
  max-width: 480px;
  background: ${theme.surface};
  border: 1px solid ${theme.border};
  border-radius: 16px;
  padding: 20px;
`

export const StatusTitle = styled.h3`
  font-size: 13px;
  font-weight: 600;
  color: ${theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 14px;
`

export const TxList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const TxRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: ${theme.bg};
  border-radius: 8px;
  font-size: 13px;
`

export const TxDirection = styled.span`
  font-size: 11px;
  color: ${theme.textMuted};
  white-space: nowrap;
`

export const TxAmount = styled.span`
  font-weight: 600;
  flex: 1;
`

export const TxHash = styled.a`
  font-size: 11px;
  color: ${theme.primary};
  text-decoration: none;
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 80px;

  &:hover {
    text-decoration: underline;
  }
`

export const StatusBadge = styled.span<{ $status: TxStatus }>`
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 99px;
  font-weight: 600;
  background: ${({ $status }) =>
    $status === 'completed'
      ? 'rgba(20, 241, 149, 0.15)'
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
  padding: 16px 0;
`
