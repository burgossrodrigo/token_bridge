import React, { useState, useEffect, useRef } from 'react'
import type { Token } from '../../types'
import {
  SelectorWrapper,
  SelectorButton,
  TokenSymbol,
  TokenName,
  Chevron,
  Dropdown,
  DropdownItem,
} from './style'

interface Props {
  tokens: Token[]
  selected: Token | null
  onChange: (token: Token) => void
}

export function TokenSelector({ tokens, selected, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <SelectorWrapper ref={ref}>
      <SelectorButton onClick={() => setOpen((v) => !v)}>
        <span>
          {selected ? (
            <>
              <TokenSymbol>{selected.symbol}</TokenSymbol>
              <TokenName>{selected.name}</TokenName>
            </>
          ) : (
            <TokenName>Select token</TokenName>
          )}
        </span>
        <Chevron $open={open}>▼</Chevron>
      </SelectorButton>

      {open && (
        <Dropdown>
          {tokens.map((t) => (
            <DropdownItem
              key={t.solMint}
              $active={selected?.solMint === t.solMint}
              onClick={() => {
                onChange(t)
                setOpen(false)
              }}
            >
              <TokenSymbol>{t.symbol}</TokenSymbol>
              <TokenName>{t.name}</TokenName>
            </DropdownItem>
          ))}
        </Dropdown>
      )}
    </SelectorWrapper>
  )
}
