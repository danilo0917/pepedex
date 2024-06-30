import { CurrencyAmount, Price, ReturnTypeGetAllRouteComputeAmountOut } from '@raydium-io/raydium-sdk'
import { create } from 'zustand'

import { Numberish } from '@/types/constants'

import { BestResultStartTimeInfo } from '../ammV3PoolInfoAndLiquidity/type'
import { SplToken } from '../token/type'

export type SwapInfo = {
  ammKey: string
  label: string
  inputMint: string
  outputMint: string
  inAmount: Numberish
  outAmount: Numberish
  feeAmount: Numberish
  feeMint: string
}
export type RoutePlan = {
  swapInfo: SwapInfo
  percent: number
}
export type AggregatorStore = {
  directionReversed: boolean // determine pairSide  swap make this to be true

  coin1?: SplToken
  coin2?: SplToken
  coin1Amount?: Numberish // may with fee and slippage
  coin2Amount?: Numberish // may with fee and slippage
  isCoin1CalculateTarget: boolean // while coin1 is calculating to a new token
  isCoin2CalculateTarget: boolean // while coin2 is calculating to a new token

  timeTaken?: Numberish
  contextSlot?: Numberish
  otherAmountThreshold?: Numberish
  isInsufficientLiquidity?: boolean
  routePlan?: RoutePlan[]
  focusSide: 'coin1' | 'coin2' // make swap fixed (userInput may change this)

  /** only exist when maxSpent is undefined */
  minReceived?: Numberish // min received amount

  /** only exist when minReceived is undefined */
  maxSpent?: Numberish // max received amount

  /** unit: % */
  priceImpact?: Numberish
  slippageBps?: Numberish

  // swap amount calculating may cost long time
  isCalculating?: boolean

  routeType?: RouteType
  fee?: CurrencyAmount[] // by SDK
  swapable?: boolean
  scrollToInputBox: () => void
  klineData: {
    [marketId: string]: { priceData: number[]; updateTime: number }
  }

  // just for trigger refresh
  refreshCount: number
  refreshSwap: () => void
}
export type RouteType = 'amm' | 'route' | undefined // SDK haven't export this type, and can't find by extract existing type. so have to write manually in UI code.

export const useAggregator = create<AggregatorStore>((set, get) => ({
  directionReversed: false,
  isCoin1CalculateTarget: false,
  isCoin2CalculateTarget: false,

  focusSide: 'coin1',

  priceImpact: 0.09,

  scrollToInputBox: () => { },
  klineData: {},

  refreshCount: 0,
  refreshSwap: () => {
    set({
      refreshCount: get().refreshCount + 1
    })
  }
}))
