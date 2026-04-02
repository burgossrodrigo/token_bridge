import styled from 'styled-components'
import { theme } from '../../styles/theme'

export const HeaderRoot = styled.header`
  width: 100%;
  max-width: 480px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 0 8px;
`

export const ChainPills = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

export const ChainPill = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: ${theme.surfaceElevated};
  border: 1px solid ${theme.border};
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  color: ${theme.textMuted};
  letter-spacing: 0.03em;
`

export const ConnectPill = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: ${theme.surfaceElevated};
  border: 1px solid ${theme.border};
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  color: ${theme.textMuted};
  letter-spacing: 0.03em;
  cursor: pointer;
  transition: border-color 0.15s;

  &:hover {
    border-color: ${theme.purple};
    color: ${theme.text};
  }
`

export const ChainDot = styled.span<{ $color: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

export const UserArea = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const Avatar = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: ${theme.gradient};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
`

export const AuthButton = styled.button<{ $variant?: 'signin' | 'signout' }>`
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid ${({ $variant }) => ($variant === 'signout' ? theme.border : theme.purple)};
  background: ${({ $variant }) =>
    $variant === 'signout' ? 'transparent' : `${theme.purple}22`};
  color: ${({ $variant }) => ($variant === 'signout' ? theme.textMuted : theme.purple)};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;

  &:hover {
    background: ${({ $variant }) =>
      $variant === 'signout' ? `${theme.border}44` : `${theme.purple}44`};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export const AuthError = styled.span`
  font-size: 11px;
  color: ${theme.danger};
`
