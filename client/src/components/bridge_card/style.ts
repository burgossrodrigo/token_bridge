import styled from 'styled-components'
import { theme } from '../../styles/theme'

export const CardRoot = styled.div`
  width: 100%;
  max-width: 480px;
  background: ${theme.surface};
  border: 1px solid ${theme.border};
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`

export const BalanceSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

export const BalanceLabel = styled.span`
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: ${theme.textMuted};
  text-transform: uppercase;
`

export const BalanceAmount = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: ${theme.text};
  letter-spacing: -0.5px;
`

export const AccentBars = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 2px;
`

export const AccentBar = styled.div<{ $color: string; $flex: number }>`
  height: 4px;
  border-radius: 2px;
  background: ${({ $color }) => $color};
  flex: ${({ $flex }) => $flex};
`

export const AccentBarTrack = styled.div`
  flex: 2;
  height: 4px;
  border-radius: 2px;
  background: ${theme.border};
`

export const AssetCard = styled.div`
  border-radius: 16px;
  background: ${theme.gradient};
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const AssetCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

export const AssetCardTitle = styled.span`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.7);
`

export const AssetCardActions = styled.div`
  display: flex;
  gap: 6px;
`

export const AssetCardBtn = styled.button`
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }
`

export const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const FieldLabel = styled.label`
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.06em;
`

export const AmountInput = styled.input`
  width: 100%;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  outline: none;
  transition: border-color 0.15s;

  &::placeholder {
    color: rgba(255, 255, 255, 0.35);
    font-weight: 400;
  }

  &:focus {
    border-color: rgba(255, 255, 255, 0.5);
  }

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
  padding: 10px 12px;
  background: ${theme.surfaceElevated};
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
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`

export const AddrValue = styled.span`
  font-family: monospace;
  color: ${theme.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  text-align: right;
  font-size: 12px;
`

export const NotConnectedHint = styled.span`
  font-size: 11px;
  color: ${theme.textMuted};
  text-align: right;
  flex: 1;
`

export const BridgeButton = styled.button<{ $loading: boolean }>`
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  border: none;
  font-size: 15px;
  font-weight: 700;
  cursor: ${({ $loading }) => ($loading ? 'not-allowed' : 'pointer')};
  background: ${({ $loading }) => ($loading ? theme.border : theme.gradientTeal)};
  color: ${({ $loading }) => ($loading ? theme.textMuted : '#fff')};
  transition: opacity 0.15s;
  letter-spacing: 0.02em;

  &:hover:not(:disabled) {
    opacity: 0.88;
  }

  &:disabled {
    opacity: 0.45;
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
