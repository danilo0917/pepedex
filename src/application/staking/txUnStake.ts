
import txHandler from '@/application/txTools/handleTx'
import assert from '@/functions/assert'

import { BN, web3 } from '@project-serum/anchor'
import { createUnstakeIx } from '@/programs/staking/instructions'
import { AnchorWallet } from '@solana/wallet-adapter-react'

export default async function txUnStake(
  stakePoolAddress: web3.PublicKey,
  amount: BN,
  tokenAddress: web3.PublicKey,
  decimals: number,
  name: string
) {
  return txHandler(async ({ transactionCollector, baseUtils: { owner, connection } }) => {
    // const piecesCollector = createTransactionCollector()
    assert(owner, 'require connected wallet')
    let unstakeIx = await createUnstakeIx(owner, tokenAddress, amount, stakePoolAddress);
    let tx = new web3.Transaction().add(unstakeIx);
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
    tx.feePayer = owner

    transactionCollector.add(tx, {
      txHistoryInfo: {
        title: 'UnStake',
        description: `UnStake ${parseFloat(amount.toString()) / Math.pow(10, decimals)} ${name}`
      }
    })
  })
}

export async function sendTransaction(transaction: web3.Transaction, owner: web3.PublicKey, adapter: AnchorWallet, connection: web3.Connection): Promise<string> {
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  transaction.feePayer = owner;

  let tx = await adapter.signTransaction(transaction);
  return await connection.sendRawTransaction(tx.serialize(), { skipPreflight: true });
}