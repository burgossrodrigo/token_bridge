import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseUnits,
  type Address,
  type WalletClient,
  type PublicClient,
} from 'viem'
import { sepolia } from 'viem/chains'
import { ETH_BRIDGE_ADDRESS } from '../constants/tokens'
import type { Token } from '../types'

const BRIDGE_ABI = [
  {
    name: 'bridgeSent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_token', type: 'address' },
      { name: '_amount', type: 'uint256' },
      { name: '_to', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'bridgeable',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

function getPublicClient(): PublicClient {
  return createPublicClient({ chain: sepolia, transport: http() })
}

function getWalletClient(): WalletClient {
  return createWalletClient({
    chain: sepolia,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transport: custom((window as any).ethereum),
  })
}

/** Converts a base58 Solana pubkey string to a 32-byte hex bytes32 value */
function solPubkeyToBytes32(base58Pubkey: string): `0x${string}` {
  // Use the bs58 encoding: decode base58, pad to 32 bytes
  // We do a simple manual decode here to avoid an extra dep
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  let num = 0n
  for (const char of base58Pubkey) {
    num = num * 58n + BigInt(ALPHABET.indexOf(char))
  }
  const hex = num.toString(16).padStart(64, '0')
  return `0x${hex}`
}

export async function bridgeSentEth(
  token: Token,
  amount: string,
  solanaDestination: string,
  fromAddress: Address
): Promise<`0x${string}`> {
  const publicClient = getPublicClient()
  const walletClient = getWalletClient()

  const rawAmount = parseUnits(amount, token.decimals)
  const tokenAddr = token.ethAddress as Address
  const bridgeAddr = ETH_BRIDGE_ADDRESS as Address

  // Check and set allowance
  const allowance = await publicClient.readContract({
    address: tokenAddr,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [fromAddress, bridgeAddr],
  })

  if (allowance < rawAmount) {
    const approveTxHash = await walletClient.writeContract({
      address: tokenAddr,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [bridgeAddr, rawAmount],
      account: fromAddress,
      chain: sepolia,
    })
    await publicClient.waitForTransactionReceipt({ hash: approveTxHash })
  }

  const toBytes32 = solPubkeyToBytes32(solanaDestination)

  const txHash = await walletClient.writeContract({
    address: bridgeAddr,
    abi: BRIDGE_ABI,
    functionName: 'bridgeSent',
    args: [tokenAddr, rawAmount, toBytes32],
    account: fromAddress,
    chain: sepolia,
  })

  return txHash
}
