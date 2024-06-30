import { useRouter } from 'next/router'

import { WSOL } from '@raydium-io/raydium-sdk'

import { getAllSwapableRouteInfos } from '@/application/ammV3PoolInfoAndLiquidity/ammAndLiquidity'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { makeAbortable } from '@/functions/makeAbortable'
import { eq, isMeaningfulNumber } from '@/functions/numberish/compare'
import { minus } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import { useDebounce } from '@/hooks/useDebounce'
import { useIdleEffect } from '@/hooks/useIdleEffect'
import { useEffect } from 'react'
import useAppSettings from '../common/useAppSettings'
import useConnection from '../connection/useConnection'
import useLiquidity from '../liquidity/useLiquidity'
import useWallet from '../wallet/useWallet'
import { useAggregator } from './useAggregator'
import { Connection } from '@solana/web3.js'
import { Numberish } from '@/types/constants'
import { SplToken } from '../token/type'
import assert from '@/functions/assert'
import jFetch from '@/functions/dom/jFetch'
import path from 'path'
import { info } from 'console'

export function useAggregatorAmountCalculator() {
  const { pathname } = useRouter()
  const connection = useConnection((s) => s.connection)
  const coin1 = useAggregator((s) => s.coin1)
  const coin2 = useAggregator((s) => s.coin2)
  const userCoin1Amount = useAggregator((s) => s.coin1Amount)
  const userCoin2Amount = useAggregator((s) => s.coin2Amount)
  const refreshCount = useAggregator((s) => s.refreshCount)
  const directionReversed = useAggregator((s) => s.directionReversed)
  const focusSide = directionReversed ? 'coin2' : 'coin1' // temporary focus side is always up, due to swap route's `Trade.getBestAmountIn()` is not ready
  const slippageTolerance = useAppSettings((s) => s.slippageTolerance)
  const connected = useWallet((s) => s.connected)
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)

  /** for swap is always from up to down, up/down is easier to calc */
  const upCoin = directionReversed ? coin2 : coin1
  const upCoinAmount = (directionReversed ? userCoin2Amount : userCoin1Amount) || '0'
  const downCoin = directionReversed ? coin1 : coin2
  const downCoinAmount = (directionReversed ? userCoin1Amount : userCoin2Amount) || '0'

  // clean old data
  useEffect(() => {
    useAggregator.setState({
      isCalculating: false,
      fee: undefined,
      minReceived: undefined,
      maxSpent: undefined,
      priceImpact: undefined,
      ...{ [focusSide === 'coin1' ? 'coin2Amount' : 'coin1Amount']: undefined }
    })
  }, [connection, coin1?.mintString, coin2?.mintString, directionReversed])

  const startCalc = useDebounce(
    () => {

      if (isApprovePanelShown) {
        useAggregator.setState({ isCalculating: false })
        return // prevent update if approve panel shown
      }

      // pairInfo is not enough
      if (!upCoin || !downCoin || !connection || !pathname.startsWith('/swap')) {
        useAggregator.setState({
          isInsufficientLiquidity: undefined,
          isCalculating: false,
          fee: undefined,
          minReceived: undefined,
          maxSpent: undefined,
          priceImpact: undefined,
          ...{ [focusSide === 'coin1' ? 'coin2Amount' : 'coin1Amount']: undefined }
        })
        return
      }

      const focusDirectionSide = 'up' // temporary focus side is always up, due to swap route's `Trade.getBestAmountIn()` is not ready

      // SOL / WSOL is special
      const inputIsSolWSOL = isMintEqual(coin1, coin2) && isMintEqual(coin1, WSOL.mint)
      if (inputIsSolWSOL) {
        if (eq(userCoin1Amount, userCoin2Amount)) return
        const { isApprovePanelShown } = useAppSettings.getState()
        if (isApprovePanelShown) return // !don't refresh when approve shown
        useAggregator.setState({
          isCalculating: false,
          fee: undefined,
          minReceived: undefined,
          maxSpent: undefined,
          priceImpact: undefined,
          ...{
            [focusSide === 'coin1' ? 'coin2Amount' : 'coin1Amount']:
              focusSide === 'coin1' ? toString(userCoin1Amount) : toString(userCoin2Amount),
            [focusSide === 'coin1' ? 'isCoin2CalculateTarget' : 'isCoin1CalculateTarget']: false
          }
        })
        return
      }

      // empty upCoinAmount
      if (!isMeaningfulNumber(upCoinAmount)) {
        useAggregator.setState(directionReversed ? { coin1Amount: undefined } : { coin2Amount: undefined })
        useAggregator.setState({
          isCalculating: false,
          fee: undefined,
          minReceived: undefined,
          maxSpent: undefined,
          priceImpact: undefined,
        })
        return
      }

      const { abort: abortCalc } = makeAbortable(async (canContinue) => {
        useAggregator.setState({ isCalculating: true })
        const infos = await getAllAggregatorInfo({
          connection,
          input: upCoin,
          output: downCoin,
          inputAmount: upCoinAmount,
          slippageTolerance
        })
        if (!infos) return
        if (!canContinue()) return

        const resultStillFresh = (() => {
          const directionReversed = useAggregator.getState().directionReversed
          const currentUpCoinAmount =
            (directionReversed ? useAggregator.getState().coin2Amount : useAggregator.getState().coin1Amount) || '0'
          const currentDownCoinAmount =
            (directionReversed ? useAggregator.getState().coin1Amount : useAggregator.getState().coin2Amount) || '0'
          const currentFocusSideAmount = focusDirectionSide === 'up' ? currentUpCoinAmount : currentDownCoinAmount
          const focusSideAmount = focusDirectionSide === 'up' ? upCoinAmount : downCoinAmount
          return eq(currentFocusSideAmount, focusSideAmount)
        })()
        if (!resultStillFresh) return

        useAggregator.setState({
          // coin2Amount: infos.outAmount,
          otherAmountThreshold: infos.otherAmountThreshold,
          priceImpact: infos.priceImpactPct,
          routePlan: infos.routePlan,
          slippageBps: infos.slippageBps,
          timeTaken: infos.timeTaken,
          contextSlot: infos.contextSlot,
          isCalculating: false,
          ...{
            [focusSide === 'coin1' ? 'coin2Amount' : 'coin1Amount']:
              infos.outAmount && (infos.outAmount) / (Math.pow(10, focusSide === 'coin1' ? downCoin.decimals : downCoin.decimals)),
            [focusSide === 'coin1' ? 'isCoin2CalculateTarget' : 'isCoin1CalculateTarget']: false
          }
        })
      })

      return abortCalc
    },
    { debouncedOptions: { delay: 300 } }
  )

  // if don't check focusSideCoin, it will calc twice.
  // one for coin1Amount then it will change coin2Amount
  // changing coin2Amount will cause another calc
  useIdleEffect(() => {
    useAggregator.setState({ isCalculating: true })
    startCalc()
  }, [
    isApprovePanelShown,
    upCoin?.mintString,
    downCoin?.mintString,
    directionReversed,
    focusSide === 'coin1' ? toString(userCoin1Amount) : toString(userCoin2Amount),
    focusSide,
    slippageTolerance,
    connection,
    pathname,
    refreshCount,
    connected, // init fetch data
    // jsonInfos
  ])
}

export const GET_QUOTE_ENDPOINT = "https://quote-api.jup.ag/v6/quote"

type QUOTE_RESPONSE = {
  inputMint: string
  inAmount: Numberish
  outputMint: string
  outAmount: Numberish
  otherAmountThreshold: Numberish
  swapMode: string
  slippageBps: number
  platformFee: any
  priceImpactPct: Numberish
  routePlan: []
  contextSlot: number
  timeTaken: number
}

async function getAllAggregatorInfo({
  connection = useConnection.getState().connection,
  slippageTolerance = useAppSettings.getState().slippageTolerance,
  input,
  output,
  inputAmount
}: {
  connection?: Connection
  slippageTolerance?: Numberish
  input: SplToken
  output: SplToken
  inputAmount: Numberish
}) {
  assert(connection, 'need connection to get default')
  const result: QUOTE_RESPONSE | any = await jFetch(
    GET_QUOTE_ENDPOINT + "?inputMint=" + input.mint + "&outputMint=" + output.mint + "&amount=" + parseFloat(inputAmount.toString()) * Math.pow(10, input.decimals) + "&swapMode=ExactIn" + "&onlyDirectRoutes=false")

  return result
}
