import styled from 'styled-components'
import { theme } from '../../styles/theme'

export const SelectorWrapper = styled.div`
  position: relative;
  width: 100%;
`

export const SelectorButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: ${theme.bg};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  color: ${theme.text};
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.15s;

  &:hover {
    border-color: ${theme.primary};
  }
`

export const TokenSymbol = styled.span`
  font-weight: 600;
`

export const TokenName = styled.span`
  font-size: 12px;
  color: ${theme.textMuted};
  margin-left: 8px;
`

export const Chevron = styled.span<{ $open: boolean }>`
  font-size: 10px;
  color: ${theme.textMuted};
  transition: transform 0.15s;
  transform: ${({ $open }) => ($open ? 'rotate(180deg)' : 'rotate(0deg)')};
`

export const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: ${theme.surface};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  overflow: hidden;
  z-index: 50;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
`

export const DropdownItem = styled.button<{ $active: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: ${({ $active }) => ($active ? 'rgba(153, 69, 255, 0.12)' : 'transparent')};
  border: none;
  color: ${theme.text};
  font-size: 14px;
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;

  &:hover {
    background: rgba(153, 69, 255, 0.08);
  }
`
