import { createGlobalStyle } from 'styled-components'
import { theme } from './theme'

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    background-color: ${theme.bg};
    color: ${theme.text};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  /* Override Solana wallet adapter button to fit our header */
  .wallet-adapter-button {
    height: 36px !important;
    font-size: 13px !important;
    border-radius: 8px !important;
    padding: 0 16px !important;
    background: ${theme.primary} !important;
  }

  .wallet-adapter-button:hover {
    background: ${theme.primaryHover} !important;
  }

  .wallet-adapter-modal-wrapper {
    background: ${theme.surface} !important;
    border: 1px solid ${theme.border} !important;
  }
`
