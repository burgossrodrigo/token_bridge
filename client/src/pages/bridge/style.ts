import styled from 'styled-components'
import { theme } from '../../styles/theme'

export const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  background: ${theme.bg};
  padding: 0 16px 64px;
`

export const Main = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 480px;
  padding-top: 24px;
`
