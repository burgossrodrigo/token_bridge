import styled from 'styled-components'
import { theme } from '../../styles/theme'

export const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  background: ${theme.bg};
`

export const Main = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 40px 16px 64px;
`
