import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Providers } from './providers'
import { GlobalStyle } from './styles/global'
import { BridgePage } from './pages/bridge'

function App() {
  return (
    <Providers>
      <GlobalStyle />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<BridgePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </Providers>
  )
}

export default App
