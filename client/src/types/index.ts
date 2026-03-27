export type Direction = 'eth_to_sol' | 'sol_to_eth'

export interface Token {
  symbol: string
  name: string
  ethAddress: string
  solMint: string
  decimals: number
}

export type TxStatus = 'pending' | 'completed' | 'failed'

export interface TxRecord {
  id: string
  direction: Direction
  token: Token
  amount: string
  from: string
  to: string
  status: TxStatus
  hash: string
  timestamp: number
}
