
import txHandler from '@/application/txTools/handleTx'
import assert from '@/functions/assert'

import { BN, Program, web3 } from '@project-serum/anchor'
import { Staking } from '@/programs/types/staking'
import { calculateStakeEntryPda } from '@/programs/staking/pda'
import { createStakeEntryIx, createStakeIx } from '@/programs/staking/instructions'
import { AnchorWallet } from '@solana/wallet-adapter-react'

export default async function txStake(
  program: Program<Staking>,
  stakePoolAddress: web3.PublicKey,
  amount: BN,
  tokenAddress: web3.PublicKey,
  decimals: number,
  name: string
) {
  return txHandler(async ({ transactionCollector, baseUtils: { owner, connection } }) => {
    // const piecesCollector = createTransactionCollector()
    assert(owner, 'require connected wallet')
    let [stakeEntryAddress, _] = await calculateStakeEntryPda(owner, stakePoolAddress);
    let stakeEntry = await program.account.stakeEntry.fetchNullable(stakeEntryAddress);
    let tx = new web3.Transaction();
    if (stakeEntry == null) {
      let stakeEntryIx = await createStakeEntryIx(owner, stakePoolAddress);
      tx.add(stakeEntryIx);
    }

    let stakeIx = await createStakeIx(owner, tokenAddress, amount, stakePoolAddress);
    tx.add(stakeIx);
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
    tx.feePayer = owner

    transactionCollector.add(tx, {
      txHistoryInfo: {
        title: 'Stake',
        description: `Stake ${parseFloat(amount.toString()) / Math.pow(10, decimals)} ${name}`
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