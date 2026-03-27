import {
  Connection,
  PublicKey,
  Transaction,
  type SendOptions,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token'
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor'
import type { WalletContextState } from '@solana/wallet-adapter-react'
import { SOL_PROGRAM_ID, SOL_RPC_URL } from '../constants/tokens'
import type { Token } from '../types'
import IDL from '../../../contracts/solana/target/idl/bridge.json'

function getConnection(): Connection {
  return new Connection(SOL_RPC_URL, 'confirmed')
}

/** Converts a 0x-prefixed Ethereum address to a Solana PublicKey (zero-padded) */
function ethAddressToPublicKey(ethAddress: string): PublicKey {
  const hex = ethAddress.replace('0x', '').padStart(64, '0')
  const bytes = Buffer.from(hex, 'hex')
  return new PublicKey(bytes)
}

export async function bridgeSendSol(
  token: Token,
  amount: string,
  ethDestination: string,
  wallet: WalletContextState
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected')
  }

  const connection = getConnection()

  const provider = new AnchorProvider(
    connection,
    {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions!,
    },
    { commitment: 'confirmed' }
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const program = new Program(IDL as any, provider)

  const mintPubkey = new PublicKey(token.solMint)
  const userAta = getAssociatedTokenAddressSync(mintPubkey, wallet.publicKey)

  const toPubkey = ethAddressToPublicKey(ethDestination)

  // Ensure user's ATA exists
  const ataInfo = await connection.getAccountInfo(userAta)
  const preTx = new Transaction()
  if (!ataInfo) {
    preTx.add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        userAta,
        wallet.publicKey,
        mintPubkey
      )
    )
  }

  // Decimals: token.decimals (18 for ETH-origin token, typically 6-9 for SPL)
  // We use 9 decimals as default for SPL tokens
  const SPL_DECIMALS = 9
  const rawAmount = new BN(
    Math.floor(parseFloat(amount) * 10 ** SPL_DECIMALS).toString()
  )

  const sendOptions: SendOptions = { skipPreflight: false }

  if (preTx.instructions.length > 0) {
    const { blockhash } = await connection.getLatestBlockhash()
    preTx.recentBlockhash = blockhash
    preTx.feePayer = wallet.publicKey
    const signed = await wallet.signTransaction(preTx)
    await connection.sendRawTransaction(signed.serialize(), sendOptions)
  }

  // Call bridge_send
  const tx = await (program.methods as any)
    .bridgeSend(rawAmount, toPubkey)
    .accounts({
      mint: mintPubkey,
      tokenAccount: userAta,
      user: wallet.publicKey,
    })
    .rpc({ commitment: 'confirmed' })

  return tx
}
