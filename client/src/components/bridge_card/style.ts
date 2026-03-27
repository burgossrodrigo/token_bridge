import styled from 'styled-components'
import { theme } from '../../styles/theme'

export const CardRoot = styled.div`
  width: 100%;
  max-width: 480px;
  background: ${theme.surface};
  border: 1px solid ${theme.border};
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`

export const CardTitle = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: ${theme.text};
`

export const DirectionToggle = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px;
  background: ${theme.bg};
  border: 1px solid ${theme.border};
  border-radius: 10px;
  color: ${theme.text};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;

  &:hover {
    border-color: ${theme.primary};
    background: rgba(153, 69, 255, 0.06);
  }
`

export const ChainLabel = styled.span<{ $chain: 'eth' | 'sol' }>`
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  background: ${({ $chain }) =>
    $chain === 'eth' ? 'rgba(98, 126, 234, 0.15)' : 'rgba(153, 69, 255, 0.15)'};
  color: ${({ $chain }) => ($chain === 'eth' ? '#627eea' : theme.primary)};
`

export const SwapIcon = styled.span`
  color: ${theme.textMuted};
  font-size: 16px;
`

export const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const FieldLabel = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: ${theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

export const AmountInput = styled.input`
  width: 100%;
  padding: 10px 14px;
  background: ${theme.bg};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  color: ${theme.text};
  font-size: 18px;
  font-weight: 600;
  outline: none;
  transition: border-color 0.15s;

  &::placeholder {
    color: ${theme.textMuted};
    font-weight: 400;
  }

  &:focus {
    border-color: ${theme.primary};
  }

  /* Hide number spinners */
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  -moz-appearance: textfield;
`

export const AddressRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  background: ${theme.bg};
  border: 1px solid ${theme.border};
  border-radius: 10px;
`

export const AddressLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
`

export const AddrKey = styled.span`
  color: ${theme.textMuted};
  min-width: 36px;
`

export const AddrValue = styled.span`
  font-family: monospace;
  color: ${theme.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  text-align: right;
`

export const NotConnectedHint = styled.span`
  font-family: monospace;
  color: ${theme.textMuted};
  font-size: 11px;
  text-align: right;
  flex: 1;
`

export const BridgeButton = styled.button<{ $loading: boolean }>`
  width: 100%;
  padding: 14px;
  border-radius: 10px;
  border: none;
  font-size: 16px;
  font-weight: 700;
  cursor: ${({ $loading }) => ($loading ? 'not-allowed' : 'pointer')};
  background: ${({ $loading }) =>
    $loading ? theme.border : theme.gradient};
  color: ${({ $loading }) => ($loading ? theme.textMuted : '#fff')};
  transition: opacity 0.15s;
  letter-spacing: 0.02em;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export const ErrorMessage = styled.p`
  font-size: 13px;
  color: ${theme.danger};
  padding: 10px 14px;
  background: rgba(239, 68, 68, 0.08);
  border-radius: 8px;
  border: 1px solid rgba(239, 68, 68, 0.2);
`
