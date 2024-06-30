
import txHandler from '@/application/txTools/handleTx'
import assert from '@/functions/assert'

import { BN, web3 } from '@project-serum/anchor'
import { createClaimRewardsIx, createUnstakeIx } from '@/programs/staking/instructions'
import { AnchorWallet } from '@solana/wallet-adapter-react'
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddress } from '@solana/spl-token'
import { ZERO } from '@raydium-io/raydium-sdk'

export default async function txHarvest(
  stakePoolAddress: web3.PublicKey,
  amount: number,
  tokenAddress: web3.PublicKey,
  decimals: number
) {
  return txHandler(async ({ transactionCollector, baseUtils: { owner, connection } }) => {
    // const piecesCollector = createTransactionCollector()
    assert(owner, 'require connected wallet')
    let tx = new web3.Transaction();
    // if (!(amount > 0)) {
    //   let associatedAddress = await getAssociatedTokenAddress(tokenAddress, owner);
    //   let ix = createAssociatedTokenAccountInstruction(owner, associatedAddress, owner, tokenAddress);
    //   tx.add(ix);
    // }

    let ix = await createClaimRewardsIx(owner, tokenAddress, stakePoolAddress);
    tx.add(ix);
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
    tx.feePayer = owner

    transactionCollector.add(tx, {
      txHistoryInfo: {
        title: 'Harvest',
        description: `Harvest Pepewifhat`
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