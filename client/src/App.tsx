import React from 'react';
import logo from './logo.svg';
import './App.css';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';
import { chain, createClient, configureChains, Chain } from "wagmi"
import {
  RainbowKitProvider,
  connectorsForWallets, 
  wallet, 
  darkTheme
} from '@rainbow-me/rainbowkit'

function App() {

  const { chains, provider } = configureChains(
    [chain.polygonMumbai, chain.goerli],
    [jsonRpcProvider({ rpc: chain => ({ http: chain.rpcUrls.default }) })]

  )

  const connectors = connectorsForWallets([
    {
      groupName: 'Recommended',
      wallets: [
        wallet.metaMask({ chains }),
        wallet.walletConnect({ chains }),
        wallet.trust({ chains })
      ],
    },
  ]);

  const wagmiClient = createClient({
    autoConnect: true,
    connectors,
    provider
  })


  return (
    <div className="App">

    </div>
  );
}

export default App;
