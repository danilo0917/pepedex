import { createRef, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { twMerge } from 'tailwind-merge'

import useAppSettings from '@/application/common/useAppSettings'
import useConnection from '@/application/connection/useConnection'
import useLiquidity from '@/application/liquidity/useLiquidity'
import useNotification from '@/application/notification/useNotification'
import { routeTo } from '@/application/routeTools'
import { isApiPoolInfoItem } from '@/application/swap/is'
import { getCoingeckoChartPriceData } from '@/application/swap/klinePrice'
import txSwapWithAggregator from '@/application/swap/txSwapWithAggregator'
import txUnwrapAllWSOL from '@/application/swap/txUnwrapWSOL'
import { useAggregator } from '@/application/swap/useAggregator'
import { useSwapAmountCalculator } from '@/application/swap/useSwapAmountCalculator'
import useSwapInitCoinFiller from '@/application/swap/useSwapInitCoinFiller'
import useSwapUrlParser from '@/application/swap/useSwapUrlParser'
import { verifyToken } from '@/application/token/getOnlineTokenInfo'
import {
  isQuantumSOLVersionSOL,
  isQuantumSOLVersionWSOL,
  QuantumSOLVersionSOL,
  QuantumSOLVersionWSOL,
  SOL_BASE_BALANCE,
  SOLDecimals,
  toUITokenAmount
} from '@/application/token/quantumSOL'
import { SplToken } from '@/application/token/type'
import useToken, { RAYDIUM_MAINNET_TOKEN_LIST_NAME } from '@/application/token/useToken'
import { USDCMint, USDTMint } from '@/application/token/wellknownToken.config'
import useWallet from '@/application/wallet/useWallet'
import { AddressItem } from '@/components/AddressItem'
import { Badge } from '@/components/Badge'
import Button, { ButtonHandle } from '@/components/Button'
import Card from '@/components/Card'
import CoinAvatar from '@/components/CoinAvatar'
import CoinInputBox, { CoinInputBoxHandle } from '@/components/CoinInputBox'
import Col from '@/components/Col'
import Collapse from '@/components/Collapse'
import CyberpunkStyleCard from '@/components/CyberpunkStyleCard'
import FadeInStable, { FadeIn } from '@/components/FadeIn'
import Icon from '@/components/Icon'
import Input from '@/components/Input'
import LoadingCircleSmall from '@/components/LoadingCircleSmall'
import PageLayout from '@/components/PageLayout'
import RefreshCircle from '@/components/RefreshCircle'
import Row from '@/components/Row'
import Tabs from '@/components/Tabs'
import Tooltip from '@/components/Tooltip'
import { addItem, shakeFalsyItem } from '@/functions/arrayMethods'
import { toUTC } from '@/functions/date/dateFormat'
import parseDuration from '@/functions/date/parseDuration'
import formatNumber from '@/functions/format/formatNumber'
import toPubString from '@/functions/format/toMintString'
import toPercentString from '@/functions/format/toPercentString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { eq, gt, gte, isMeaningfulNumber, lt, lte } from '@/functions/numberish/compare'
import { div, mul } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import createContextStore from '@/functions/react/createContextStore'
import useAsyncMemo from '@/hooks/useAsyncMemo'
import { useForceUpdate } from '@/hooks/useForceUpdate'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect'
import useLocalStorageItem from '@/hooks/useLocalStorage'
import { useRecordedEffect } from '@/hooks/useRecordedEffect'
import useToggle from '@/hooks/useToggle'
import TokenSelectorDialog from '@/pageComponents/dialogs/TokenSelectorDialog'
import { HexAddress, Numberish } from '@/types/constants'

import { useToken2022SwapConfirmPanel } from '../application/token/useToken2022SwapConfirmPanel'
import { useSwapTwoElements } from '../hooks/useSwapTwoElements'
import { useToken2022FeeTooHighWarningChecker } from '../hooks/useToken2022FeeTooHighWarningChecker'
import { useAggregatorAmountCalculator } from '@/application/swap/useAggregatorAmountCalculator'
import useAggregatorInitCoinFiller from '@/application/swap/useAggregatorInitCoinFiller'

function SwapEffect() {
  // useSwapInitCoinFiller()
  useAggregatorInitCoinFiller()
  useSwapUrlParser()
  // useKlineDataFetcher() // temporary use coingecko price data
  // useSwapAmountCalculator()
  useAggregatorAmountCalculator()
  return null
}
const { ContextProvider: SwapUIContextProvider, useStore: useSwapContextStore } = createContextStore({
  hasAcceptedPriceChange: false,
  coinInputBox1ComponentRef: createRef<CoinInputBoxHandle>(),
  coinInputBox2ComponentRef: createRef<CoinInputBoxHandle>(),
  swapButtonComponentRef: createRef<ButtonHandle>()
})

export default function Swap() {
  return (
    <SwapUIContextProvider>
      <SwapEffect />
      <PageLayout mobileBarTitle="Swap" metaTitle="Swap - Pepedex">
        <SwapHead />
        <SwapCard />
        {/* <UnwrapWSOL /> */}
        <KLineChart />
      </PageLayout>
    </SwapUIContextProvider>
  )
}

// to check if downCoin is unOfficial (not is raydium token list but in solana token list)
function useUnofficialTokenConfirmState(): { hasConfirmed: boolean; popConfirm: () => void } {
  const directionReversed = useAggregator((s) => s.directionReversed)
  const coin1 = useAggregator((s) => s.coin1)
  const coin2 = useAggregator((s) => s.coin2)
  const downCoin = directionReversed ? coin1 : coin2
  const raydiumTokenMints = useToken((s) => s.tokenListSettings[RAYDIUM_MAINNET_TOKEN_LIST_NAME]?.mints)

  const [userPermanentConfirmedTokenMints, setUserPermanentConfirmedTokenMints] =
    useLocalStorageItem<HexAddress[] /* token mint  */>('USER_CONFIRMED_SWAP_TOKENS')

  const isDownCoinOfficial = Boolean(
    downCoin && (raydiumTokenMints?.size === 0 || raydiumTokenMints?.has(downCoin?.mintString))
  )

  const hasUserPermanentConfirmed = Boolean(
    downCoin && userPermanentConfirmedTokenMints?.includes(downCoin?.mintString)
  )

  const [hasUserTemporaryConfirmed, setHasUserTemporaryConfirmed] = useState(false)
  const [notOfficialTokenConfirmPanelOn, setNotOfficialTokenConfirmPanelOn] = useState(false)

  useEffect(() => {
    setHasUserTemporaryConfirmed(false)
  }, [downCoin])

  const freezedAsync = useMemo(() => downCoin && isFreezedToken(downCoin), [downCoin?.mintString])
  const isFreezed = useAsyncMemo(() => freezedAsync, [freezedAsync], freezedAsync === true)

  const popNotOfficialTokenConfirm = () => {
    if (notOfficialTokenConfirmPanelOn) return
    setNotOfficialTokenConfirmPanelOn(true)
    useNotification.getState().popConfirm({
      cardWidth: 'lg',
      type: 'warning',
      title: 'Confirm Token Mint Address',
      description: (
        <div className="space-y-4  text-center">
          <p className="text-[#c21d1d] font-bold">Confirm the token mint address is correct before swapping!</p>
          <p>
            Many tokens have <span className="text-[#c21d1d]">similar or identical</span> token tickers and icons.
          </p>
          <p>
            By clicking below, you understand that you are fully responsible for confirming the token you are trading.
          </p>

          <Row className="justify-center items-center gap-2 my-4 bg-field rounded py-3 w-full">
            <CoinAvatar token={downCoin} />
            <div className="font-semibold">{downCoin?.symbol}</div>
            <AddressItem textClassName="text-[#abc4ff80]" showDigitCount={8} canExternalLink>
              {downCoin?.mint}
            </AddressItem>
          </Row>
          {isFreezed && (
            <div>
              <div className="text-center my-4 text-[#7E730A] font-bold">Freeze Authority Warning</div>
              <div className="text-center my-2 text-xs text-[#7E730A]">
                This token has freeze authority enabled and could
                <br />
                prevent you from transferring or trading the token later.
              </div>
            </div>
          )}
        </div>
      ),
      confirmButtonIsMainButton: true,
      cancelButtonText: 'Cancel',
      confirmButtonText: 'I understand, Confirm',
      onConfirm: () => {
        setHasUserTemporaryConfirmed(true)
        setNotOfficialTokenConfirmPanelOn(false)
        downCoin?.mint && setUserPermanentConfirmedTokenMints((old) => addItem(old ?? [], String(downCoin.mint)))
      },
      onCancel: () => {
        setHasUserTemporaryConfirmed(false)
        setNotOfficialTokenConfirmPanelOn(false)
        useAggregator.setState(directionReversed ? { coin1: undefined } : { coin2: undefined })
      }
    })
  }

  const hasConfirmed = downCoin ? isDownCoinOfficial || hasUserPermanentConfirmed || hasUserTemporaryConfirmed : true

  useEffect(() => {
    if (!hasConfirmed && downCoin) popNotOfficialTokenConfirm()
  }, [downCoin, hasConfirmed])

  return { hasConfirmed, popConfirm: popNotOfficialTokenConfirm }
}

function SwapHead() {
  return (
    <Row className="justify-center  mb-12 mobile:mb-2">
      {/* <Tabs
        currentValue={'Swap'}
        values={['Swap', 'Liquidity']}
        onChange={(newTab) => {
          if (newTab === 'Liquidity') routeTo('/liquidity/add')
        }}
      /> */}
    </Row>
  )
}

function AllUnwrapSOLToSol() {
  const allWsolBalance = useWallet((s) => s.allWsolBalance)
  const refreshSwap = useAggregator((s) => s.refreshSwap)
  const connected = useWallet((s) => s.connected)
  const [loading, setLoading] = useState(false)

  if (gt(allWsolBalance, 0) && connected) {
    return (
      <Row className="rounded-lg p-3 bg-[#4069BB] flex justify-center items-center gap-1 mobile:mb-5">
        <Icon size="sm" heroIconName="exclamation-circle" className="ml-2 text-color" />
        <Row>
          <p className="text-xs mobile:text-2xs text-color">
            You have{' '}
            <span className="text-color">{toString(toTokenAmount(QuantumSOLVersionWSOL, allWsolBalance))}</span> WSOL
            that you can{' '}
            <span
              className="text-color cursor-pointer font-semibold"
              onClick={() => {
                setLoading(true)
                txUnwrapAllWSOL().then(({ allSuccess }) => {
                  if (allSuccess) {
                    refreshSwap()
                  }
                  setLoading(false)
                })
              }}
            >
              Unwrap
            </span>
          </p>
          {loading && <LoadingCircleSmall className="w-3 h-3 ml-2" />}
        </Row>
      </Row>
    )
  } else {
    return null
  }
}

function SwapCard() {
  const { connected: walletConnected, connecting } = useWallet()
  const coin1 = useAggregator((s) => s.coin1)
  const coin2 = useAggregator((s) => s.coin2)
  const coin1Amount = useAggregator((s) => s.coin1Amount)
  const coin2Amount = useAggregator((s) => s.coin2Amount)
  const isCoin1CalculateTarget = useAggregator((s) => s.isCoin1CalculateTarget)
  const isCoin2CalculateTarget = useAggregator((s) => s.isCoin2CalculateTarget)
  const isCalculating = useAggregator((s) => s.isCalculating)
  const directionReversed = useAggregator((s) => s.directionReversed)
  const priceImpact = useAggregator((s) => s.priceImpact)
  const refreshSwap = useAggregator((s) => s.refreshSwap)
  const balances = useWallet((s) => s.balances)
  // const preflightCalcResult = useAggregator((s) => s.preflightCalcResult)
  // const isFindingPool = !preflightCalcResult // finding Pools ...

  const tokens = useToken((s) => s.tokens)
  const tokensLoaded = Object.keys(tokens).length > 2 // loading tokens ...

  const poolsJson = useLiquidity((s) => s.jsonInfos)
  const poolsLoaded = true // loading pools ... // TODO: swap data is not liquidity's jsonInfos

  // -------- pool ready time --------
  const swapable = useAggregator((s) => s.swapable) // Pool not ready (not open yet )
  const chainTimeOffset = useConnection((s) => s.chainTimeOffset)
  const chainTime = Date.now() + (chainTimeOffset ?? 0)
  // const remainTimeText = useMemo(() => {
  //   if (!selectedCalcResultPoolStartTimes?.length) return undefined
  //   function getDurationText(val: number) {
  //     const duration = parseDuration(val)
  //     return `Pool Opens in ${String(duration.days).padStart(2, '0')}D : ${String(duration.hours).padStart(
  //       2,
  //       '0'
  //     )}H : ${String(duration.minutes).padStart(2, '0')}M`
  //   }
  //   return getDurationText(Math.max(...selectedCalcResultPoolStartTimes.map((i) => i.startTime)) - chainTime)
  // }, [selectedCalcResultPoolStartTimes, chainTime])

  // const canFindPools = useAggregator((s) => s.canFindPools) // Pool not found
  const isInsufficientLiquidity = useAggregator((s) => s.isInsufficientLiquidity) // Pool found but insufficient liquidity
  const refreshTokenPrice = useToken((s) => s.refreshTokenPrice)

  // unofficial swap token confirm
  const { hasConfirmed: hasConfirmedUnofficialToken, popConfirm: popUnofficialConfirm } =
    useUnofficialTokenConfirmState()

  const upCoin = directionReversed ? coin2 : coin1

  // although info is included in routes, still need upCoinAmount to pop friendly feedback
  const upCoinAmount = (directionReversed ? coin2Amount : coin1Amount) || '0'

  const downCoin = directionReversed ? coin1 : coin2

  // although info is included in routes, still need downCoinAmount to pop friendly feedback
  const downCoinAmount = (directionReversed ? coin1Amount : coin2Amount) || '0'

  // token 2022 confirm
  const { ConfirmDialog: PopCoin1Token2022ConfirmDialog } = useToken2022SwapConfirmPanel({
    token: coin1,
    onConfirm: () => useAggregator.setState({ coin1 }),
    onCancel: () => useAggregator.setState({ coin1: undefined })
  })

  // token 2022 confirm
  const { ConfirmDialog: PopCoin2Token2022ConfirmDialog } = useToken2022SwapConfirmPanel({
    token: coin2,
    onConfirm: () => useAggregator.setState({ coin2 }),
    onCancel: () => useAggregator.setState({ coin2: undefined })
  })

  const { hasAcceptedPriceChange, swapButtonComponentRef, coinInputBox1ComponentRef, coinInputBox2ComponentRef } =
    useSwapContextStore()

  const checkWalletHasEnoughBalance = useWallet((s) => s.checkWalletHasEnoughBalance)

  const haveEnoughUpCoin = useMemo(
    () => upCoin && checkWalletHasEnoughBalance(toTokenAmount(upCoin, upCoinAmount, { alreadyDecimaled: true })),
    [upCoin, upCoinAmount, checkWalletHasEnoughBalance, balances]
  )

  const switchDirectionReversed = useCallback(() => {
    useAggregator.setState((s) => ({ directionReversed: !s.directionReversed }))
  }, [])
  const [isCoinSelectorOn, { on: turnOnCoinSelector, off: turnOffCoinSelector }] = useToggle()
  const [targetCoinNo, setTargetCoinNo] = useState<'1' | '2'>('1')

  const swapElementBox1 = useRef<HTMLDivElement>(null)
  const swapElementBox2 = useRef<HTMLDivElement>(null)
  const [hasUISwrapped, { toggleSwap: toggleUISwap }] = useSwapTwoElements(swapElementBox1, swapElementBox2, {
    defaultHasWrapped: directionReversed
  })

  useEffect(() => {
    useAggregator.setState({ directionReversed: hasUISwrapped })
  }, [hasUISwrapped])

  const hasSwapDetermined =
    coin1 && isMeaningfulNumber(coin1Amount) && coin2 && isMeaningfulNumber(coin2Amount)
  const cardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    useAggregator.setState({
      scrollToInputBox: () => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [])

  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)

  const disabledTokens = useMemo(() => {
    if (targetCoinNo === '1' && coin2) {
      if (coin2.symbol === QuantumSOLVersionSOL.symbol) {
        return [QuantumSOLVersionWSOL]
      } else if (coin2.symbol === QuantumSOLVersionWSOL.symbol) {
        return [QuantumSOLVersionSOL]
      }
    } else if (targetCoinNo === '2' && coin1) {
      if (coin1.symbol === QuantumSOLVersionSOL.symbol) {
        return [QuantumSOLVersionWSOL]
      } else if (coin1.symbol === QuantumSOLVersionWSOL.symbol) {
        return [QuantumSOLVersionSOL]
      }
    }
    return []
  }, [targetCoinNo, coin1, coin2])

  // const currentCalcResult = useAggregator((s) => s.selectedCalcResult)
  // const expirationTime = currentCalcResult?.expirationTime // (s)
  /** token2022 related data is fresh */
  // const [isCurrentExpirationTimeRunOver, setIsCurrentExpirationTimeRunOver] = useState(expirationTime === 0)

  const { isWarningChipOpen, badToken, Token2022FeeTooHighWarningChip } = useToken2022FeeTooHighWarningChecker([
    { token: coin1, amount: coin1Amount },
    { token: coin2, amount: coin2Amount }
  ])
  return (
    <CyberpunkStyleCard
      domRef={cardRef}
      wrapperClassName="w-[min(456px,100%)] self-center cyberpunk-bg-light"
      className="py-8 pt-4 px-6 mobile:py-5 mobile:px-3"
    >
      {/* input twin */}
      <AllUnwrapSOLToSol />
      <div className="space-y-5 mt-5 mobile:mt-0">
        <CoinInputBox
          domRef={swapElementBox1}
          disabled={isApprovePanelShown}
          noDisableStyle
          disabledInput={directionReversed}
          className={directionReversed && isCalculating ? 'opacity-50' : ''}
          componentRef={coinInputBox1ComponentRef}
          haveHalfButton
          haveCoinIcon
          showTokenSelectIcon
          topLeftLabel={hasUISwrapped ? 'To' : 'From'}
          onTryToTokenSelect={() => {
            turnOnCoinSelector()
            setTargetCoinNo('1')
          }}
          onEnter={(input) => {
            if (!input) return
            if (!coin2) coinInputBox2ComponentRef.current?.selectToken?.()
            if (coin2 && coin2Amount) swapButtonComponentRef.current?.click?.()
          }}
          token={coin1}
          value={
            isCoin1CalculateTarget ? '0' : coin1Amount ? (eq(coin1Amount, 0) ? '' : toString(coin1Amount)) : undefined
          }
          onUserInput={(value) => {
            useAggregator.setState({ focusSide: 'coin1', coin1Amount: value })
          }}
          hideTransferFee
        />

        {/* swap button */}
        <div className="relative h-8">
          <Row
            className={`absolute items-center transition-all left-1/2 -translate-x-1/2
              }`}
          >
            <Icon
              size="sm"
              iconSrc="/icons/msic-swap.svg"
              className={`p-2 frosted-glass frosted-glass-teal rounded-full mr-4 ${isApprovePanelShown ? 'not-clickable' : 'clickable'
                } select-none transition`}
              onClick={() => {
                if (isApprovePanelShown) return
                toggleUISwap()
                switchDirectionReversed()
              }}
            />
          </Row>
          {/* <div className={`absolute right-0 ${isApprovePanelShown ? 'not-clickable' : 'clickable'}`}>
            <RefreshCircle
              run={!isApprovePanelShown}
              refreshKey="swap"
              popPlacement="right-bottom"
              freshFunction={() => {
                refreshSwap()
                refreshTokenPrice()
              }}
            />
          </div> */}
        </div>

        <CoinInputBox
          domRef={swapElementBox2}
          disabled={isApprovePanelShown}
          noDisableStyle
          disabledInput={!directionReversed}
          className={!directionReversed && isCalculating ? 'opacity-50' : ''}
          componentRef={coinInputBox2ComponentRef}
          haveHalfButton
          haveCoinIcon
          showTokenSelectIcon
          topLeftLabel={hasUISwrapped ? 'From' : 'To'}
          onTryToTokenSelect={() => {
            turnOnCoinSelector()
            setTargetCoinNo('2')
          }}
          onEnter={(input) => {
            if (!input) return
            if (!coin1) coinInputBox1ComponentRef.current?.selectToken?.()
            if (coin1 && coin1Amount) swapButtonComponentRef.current?.click?.()
          }}
          token={coin2}
          value={
            isCoin2CalculateTarget ? '0' : coin2Amount ? (eq(coin2Amount, 0) ? '' : toString(coin2Amount)) : undefined
          }
          onUserInput={(value) => {
            useAggregator.setState({ focusSide: 'coin2', coin2Amount: value })
          }}
          hideTransferFee
        />
      </div>
      {/* info panel */}
      <FadeInStable show={hasSwapDetermined}>
        <SwapCardInfo className="mt-5" />
      </FadeInStable>
      {/* alert user if price has accidently change  */}
      <SwapPriceAcceptChip />

      {PopCoin1Token2022ConfirmDialog}
      {PopCoin2Token2022ConfirmDialog}

      {/* alert 100% fee 2022 token can't swap */}
      {Token2022FeeTooHighWarningChip({ className: 'pt-5' })}

      {/* swap sol and wsol */}
      <Button
        className="w-full frosted-glass-teal mt-5"
        componentRef={swapButtonComponentRef}
        isLoading={isApprovePanelShown}
        validators={[
          {
            should: tokensLoaded,
            fallbackProps: {
              children: 'Loading Tokens ...'
            }
          },
          {
            should: poolsLoaded,
            fallbackProps: {
              children: 'Loading Pools ...'
            }
          },
          {
            should: walletConnected,
            forceActive: true,
            fallbackProps: {
              onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
              children: connecting ? 'Connecting...' : 'Connect Wallet'
            }
          },
          {
            should: upCoin && downCoin,
            fallbackProps: { children: 'Select a token' }
          },
          {
            should: hasConfirmedUnofficialToken,
            forceActive: true,
            fallbackProps: {
              onClick: popUnofficialConfirm,
              children: 'Confirm unOfficial warning' // user may never see this
            }
          },
          { not: isWarningChipOpen },
          {
            should: !isInsufficientLiquidity,
            fallbackProps: {
              children: (
                <Row className="items-center">
                  <div>Insufficient Liquidity</div>
                  <Tooltip className="w-full">
                    <Icon size="sm" heroIconName="question-mark-circle" className="ml-2 cursor-help" />
                    <Tooltip.Panel>
                      <p className="w-64">
                        The route for this swap includes a CLMM pool with insufficient in-range liquidity for your swap.
                        Try swapping for a smaller amount or try again later.
                      </p>
                    </Tooltip.Panel>
                  </Tooltip>
                </Row>
              )
            }
          },
          {
            should: upCoinAmount && isMeaningfulNumber(upCoinAmount),
            fallbackProps: { children: 'Enter an amount' }
          },
          { should: !isCalculating, fallbackProps: { children: 'Calculating ...' } },
          {
            should: !eq(downCoinAmount, 0),
            fallbackProps: { children: 'Swap Amount Too Small' }
          },
          {
            should: haveEnoughUpCoin,
            fallbackProps: { children: `Insufficient ${upCoin?.symbol ?? ''} balance` }
          },
          {
            should: hasAcceptedPriceChange || isApprovePanelShown,
            fallbackProps: { children: `Accept price change` }
          },
          {
            should: priceImpact && lte(priceImpact, 0.05),
            forceActive: true,
            fallbackProps: {
              onClick: ({ ev }) => {
                ev.stopPropagation()
                return popPriceConfirm({ priceImpact })
              }
            }
          }
        ]}
        onClick={txSwapWithAggregator}
      >
        Swap
      </Button>
      {/* alert user if sol is not much */}
      <RemainSOLAlert />
      {/** coin selector panel */}
      <TokenSelectorDialog
        open={isCoinSelectorOn}
        onSelectToken={(token) => {
          if (targetCoinNo === '1') {
            if (!areSameToken(coin1, token)) {
              useAggregator.setState({
                coin1: token,
                [directionReversed ? 'isCoin1CalculateTarget' : 'isCoin2CalculateTarget']: true
              })
              if (!areTokenPairSwapable(token, coin2)) {
                useAggregator.setState({ coin2: undefined })
              }
            }
          } else {
            if (!areSameToken(coin2, token)) {
              useAggregator.setState({
                coin2: token,
                [directionReversed ? 'isCoin1CalculateTarget' : 'isCoin2CalculateTarget']: true
              })
              if (!areTokenPairSwapable(token, coin1)) {
                useAggregator.setState({ coin1: undefined })
              }
            }
          }
          turnOffCoinSelector()
        }}
        onClose={turnOffCoinSelector}
        disableTokens={disabledTokens}
      />
    </CyberpunkStyleCard>
  )

  function popPriceConfirm({ priceImpact }: { priceImpact?: Numberish }) {
    useNotification.getState().popConfirm({
      type: 'error',
      title: 'High Price Impact Warning',
      description: (
        <div className="space-y-2">
          <p>
            Price impact for this swap is{' '}
            <span className="text-[#f04a44]">{priceImpact ? toPercentString(priceImpact) : 'higher than 5%'}</span>
          </p>
          <p>Confirming may result in a poor price for this swap!</p>
        </div>
      ),
      confirmButtonText: 'Swap Anyway',
      onConfirm: txSwapWithAggregator
    })
  }
}

function isSolToWsol(targetToken: SplToken | undefined, candidateToken: SplToken | undefined): boolean {
  return isQuantumSOLVersionSOL(targetToken) && isQuantumSOLVersionWSOL(candidateToken)
}

function isWsolToSol(targetToken: SplToken | undefined, candidateToken: SplToken | undefined): boolean {
  return isQuantumSOLVersionWSOL(targetToken) && isQuantumSOLVersionSOL(candidateToken)
}

function areTokenPairSwapable(targetToken: SplToken | undefined, candidateToken: SplToken | undefined): boolean {
  return (
    isSolToWsol(targetToken, candidateToken) ||
    isWsolToSol(targetToken, candidateToken) ||
    !isMintEqual(targetToken?.mint, candidateToken?.mint)
  )
}

function areSameToken(originToken: SplToken | undefined, newSelected: SplToken): boolean {
  return originToken?.mint === newSelected.mint
}

function SwapPriceAcceptChip() {
  const { hasAcceptedPriceChange, setHasAcceptedPriceChange } = useSwapContextStore()
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  const coin1 = useAggregator((s) => s.coin1)
  const coin2 = useAggregator((s) => s.coin2)
  const coin1Amount = useAggregator((s) => s.coin1Amount)
  const coin2Amount = useAggregator((s) => s.coin2Amount)
  const directionReversed = useAggregator((s) => s.directionReversed)
  const focusSide = directionReversed ? 'coin2' : 'coin1'
  const focusSideCoin = focusSide === 'coin1' ? coin1 : coin2
  const focusSideAmount = focusSide === 'coin1' ? coin1Amount : coin2Amount
  const focusOppositeSideCoin = focusSide === 'coin1' ? coin2 : coin1
  const focusOppositeSideAmount = focusSide === 'coin1' ? coin2Amount : coin1Amount

  const causedByFocusChanged = useRef(false) // flag for calc opposite in  second frame

  useRecordedEffect(
    ([
      prevFocusSideCoin,
      prevFocusSideAmount,
      prevFocusOppositeSideCoin,
      prevFocusOppositeSideAmount,
      prevDirectionReversed
    ]) => {
      const isFocusSideCoinChanged = prevFocusSideCoin != null && prevFocusSideCoin !== focusSideCoin
      const isFocusSideAmountChanged = Boolean(
        focusSideAmount && isMeaningfulNumber(prevFocusSideAmount) && !eq(prevFocusSideAmount, focusSideAmount)
      )
      const isFocusOppositeSideCoinChanged =
        prevFocusOppositeSideCoin != null && prevFocusOppositeSideCoin !== focusOppositeSideCoin
      const isFocusOppositeSideAmountChanged = Boolean(
        focusOppositeSideAmount &&
        isMeaningfulNumber(prevFocusOppositeSideAmount) &&
        !eq(prevFocusOppositeSideAmount, focusOppositeSideAmount)
      )
      const isDirectionReversedChanged = prevDirectionReversed != null && prevDirectionReversed !== directionReversed

      const everythingIsUnchanged =
        !isFocusSideCoinChanged &&
        !isFocusSideAmountChanged &&
        !isFocusOppositeSideCoinChanged &&
        !isFocusOppositeSideAmountChanged &&
        !isDirectionReversedChanged

      const isChangedByUnfocusPoint =
        !everythingIsUnchanged &&
        (isFocusSideAmountChanged ||
          isFocusSideCoinChanged ||
          isFocusOppositeSideCoinChanged ||
          isDirectionReversedChanged)

      // often caused by route change
      if (everythingIsUnchanged) {
        setHasAcceptedPriceChange(true)
      } else if (isChangedByUnfocusPoint) {
        // direction Reverse change
        // focusSideAmountChange
        setHasAcceptedPriceChange(true)
        causedByFocusChanged.current = true
      } else if (isFocusOppositeSideAmountChanged) {
        // focusSideAmountChange will always cause focusOppositeSideAmountChange
        // focusOppositeSideAmountHasChanged without focusSideAmountHasChanged pop
        if (!causedByFocusChanged.current && !isFocusSideAmountChanged) {
          setHasAcceptedPriceChange(!isFocusOppositeSideAmountChanged)
        }
        causedByFocusChanged.current = false
      }
    },
    [focusSideCoin, focusSideAmount, focusOppositeSideCoin, focusOppositeSideAmount, directionReversed] as const
  )

  const bothHaveAmount = isMeaningfulNumber(coin1Amount) && isMeaningfulNumber(coin2Amount)

  return (
    <FadeIn>
      {bothHaveAmount && !hasAcceptedPriceChange && !isApprovePanelShown && (
        <Row className="mt-5 bg-field rounded-xl py-2 px-6 mobile:px-4 items-center justify-between">
          <Row className="text-sm font-medium text-color items-center ">
            Price updated
            <Tooltip placement="bottom-right">
              <Icon size="sm" heroIconName="question-mark-circle" className="ml-2 cursor-help" />
              <Tooltip.Panel>
                <p className="w-80">Price has changed since your swap amount was entered.</p>
              </Tooltip.Panel>
            </Tooltip>
          </Row>

          <Button size="sm" className="frosted-glass-teal" onClick={() => setHasAcceptedPriceChange(true)}>
            Accept
          </Button>
        </Row>
      )}
    </FadeIn>
  )
}

function RemainSOLAlert() {
  const rawsolBalance = useWallet((s) => s.solBalance)
  const solBalance = div(rawsolBalance, 10 ** SOLDecimals)
  return (
    <FadeIn>
      {solBalance && lt(solBalance, SOL_BASE_BALANCE) && gte(solBalance, 0) && (
        <Row className="text-sm mt-4 text-[#7e7a2f] items-center justify-center">
          SOL balance: {toString(solBalance)}{' '}
          <Tooltip placement="bottom-right">
            <Icon size="sm" heroIconName="question-mark-circle" className="ml-2 cursor-help" />
            <Tooltip.Panel>
              <p className="w-80">
                SOL is needed for Solana network fees. A minimum balance of {SOL_BASE_BALANCE} SOL is recommended to
                avoid failed transactions. This swap will leave you with less than {SOL_BASE_BALANCE} SOL.
              </p>
            </Tooltip.Panel>
          </Tooltip>
        </Row>
      )}
    </FadeIn>
  )
}

function isFreezedToken(token: SplToken): boolean | Promise<boolean | undefined> {
  if (token.hasFreeze == null) {
    return verifyToken(token.mint, { noLog: true }).then((verified) => (verified != null ? !verified : undefined))
  }
  return Boolean(token.hasFreeze)
}

function SwapCardPriceIndicator({ className }: { className?: string }) {
  const [innerReversed, setInnerReversed] = useState(false)

  const coin1 = useAggregator((s) => s.coin1)
  const coin2 = useAggregator((s) => s.coin2)

  const directionReversed = useAggregator((s) => s.directionReversed)
  const upCoin = directionReversed ? coin2 : coin1
  const downCoin = directionReversed ? coin1 : coin2
  // const executionPrice = useAggregator((s) => s.executionPrice)
  const priceImpact = useAggregator((s) => s.priceImpact)

  const isDangerousPrice = useMemo(() => isMeaningfulNumber(priceImpact) && gte(priceImpact, 0.05), [priceImpact])
  const isWarningPrice = useMemo(() => isMeaningfulNumber(priceImpact) && gte(priceImpact, 0.01), [priceImpact])

  const isMobile = useAppSettings((s) => s.isMobile)
  const innerPriceLeftCoin = innerReversed ? downCoin : upCoin
  const innerPriceRightCoin = innerReversed ? upCoin : downCoin
  return (
    <Col>
      {/* <FadeIn>
        {executionPrice && !executionPrice.denominator.isZero() && (
          <Row className={twMerge('font-medium text-sm text-color', className)}>
            <div className="whitespace-nowrap">
              {1} {innerPriceLeftCoin?.symbol ?? '--'} ≈{' '}
              {toString(
                innerReversed && parseInt(executionPrice?.numerator.toString()) !== 0
                  ? div(1, executionPrice)
                  : executionPrice,
                {
                  decimalLength: isMobile ? 'auto 2' : 'auto',
                  zeroDecimalNotAuto: true
                }
              )}{' '}
              {innerPriceRightCoin?.symbol ?? '--'}
            </div>
            <div className="ml-2 clickable" onClick={() => setInnerReversed((b) => !b)}>
              ⇋
            </div>
          </Row>
        )}
      </FadeIn> */}
      <FadeIn>
        {priceImpact ? (
          <div
            className={`font-medium text-xs whitespace-nowrap ${isDangerousPrice ? 'text-[#f04a44]' : isWarningPrice ? 'text-[#7e7a2f]' : 'text-color'
              } transition-colors`}
          >
            {isDangerousPrice || isWarningPrice ? 'Price Impact Warning' : 'Low Price Impact'}
          </div>
        ) : null}
      </FadeIn>
    </Col>
  )
}

function SwapCardInfo({
  className,
  onExpirationTimeRunToZero
}: {
  className?: string
  /** when expiration time come to zero, it can't swap anymore, until data is refreh */
  onExpirationTimeRunToZero?: () => void
}) {
  const slippageTolerance = useAppSettings((s) => s.slippageTolerance)
  const slippageToleranceState = useAppSettings((s) => s.slippageToleranceState)
  const getToken = useToken((s) => s.getToken)
  const priceImpact = useAggregator((s) => s.priceImpact)
  const coin1 = useAggregator((s) => s.coin1)
  const coin2 = useAggregator((s) => s.coin2)
  const directionReversed = useAggregator((s) => s.directionReversed)
  const upCoin = directionReversed ? coin2 : coin1
  const downCoin = directionReversed ? coin1 : coin2
  const routePlan = useAggregator((s) => s.routePlan)
  let routers = ""
  if (routePlan) {
    for (let i = 0; i < routePlan.length; i++) {
      if (routePlan[i].swapInfo.label === "Raydium" || routePlan[i].swapInfo.label === "Raydium CLMM") {
        if (!routers.includes("Raydium"))
          routers += "Raydium, "
      } else if (routePlan[i].swapInfo.label === "Whirlpool") {
        routers += "Orca, "
      } else {
        routers += routePlan[i].swapInfo.label + ", "
      }
    }
  }

  const focusSide = useAggregator((s) => s.focusSide)
  const minReceived = useAggregator((s) => s.minReceived)
  const fee = useAggregator((s) => s.fee)
  const maxSpent = useAggregator((s) => s.maxSpent)

  const isDangerousPrice = useMemo(() => isMeaningfulNumber(priceImpact) && gte(priceImpact, 0.05), [priceImpact])
  const isWarningPrice = useMemo(() => isMeaningfulNumber(priceImpact) && gte(priceImpact, 0.01), [priceImpact])
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  return (
    <Col
      className={twMerge(
        `pt-5 pb-4 px-6 flex-grow border-1.5  ${isDangerousPrice
          ? 'border-[#f04a44]'
          : isWarningPrice
            ? 'border-[rgba(216,203,57,.5)]'
            : 'border-[rgba(171,196,255,.5)]'
        } rounded-xl items-center gap-3 transition-colors`,
        className
      )}
    >
      <SwapCardItem
        fieldName="Swap Router"
        fieldValue={`via ${routers.slice(0, -2)}`}
        tooltipContent="It shows the routers to be usable in swap"
      />
      <SwapCardItem
        fieldName="Price Impact"
        fieldNameTextColor={isDangerousPrice ? '#f04a44' : isWarningPrice ? '#e3dc8b' : undefined}
        fieldValue={priceImpact ? (lt(priceImpact, 0.001) ? '<0.1%' : toPercentString(priceImpact)) : '--'}
        fieldValueTextColor={isDangerousPrice ? '#f04a44' : isWarningPrice ? '#e3dc8b' : '#D0D0D8'}
        tooltipContent="The difference between the market price and estimated price due to trade size"
      />

      <Collapse openDirection="upwards" className="w-full">
        <Collapse.Body>
          <Col className="gap-3 pb-3">
            {routePlan && routePlan.map((plan, index) => {

              return (
                <SwapCardItem fieldName={`${plan.swapInfo.label === "Whirlpool" ? "Orca" : plan.swapInfo.label}`} fieldValue={`${plan.percent}%`} key={index} />
              )
            })}
            <SwapCardItem fieldName="Addresses" tooltipContent={<SwapCardTooltipPanelAddress />} />
            <SwapCardItem
              fieldName="Slippage Tolerance"
              tooltipContent="The maximum difference between your estimated price and execution price"
              fieldValue={
                <Row className="py-1 px-2 bg-field rounded-sm text-[#F1F1F2] font-medium text-xs -my-1">
                  <Input
                    className="w-7 px-0"
                    disabled={isApprovePanelShown}
                    value={toString(mul(slippageTolerance, 100), { decimalLength: 'auto 2' })}
                    onUserInput={(value) => {
                      const n = div(parseFloat(value), 100)
                      if (n) {
                        useAppSettings.setState({ slippageTolerance: n })
                      }
                    }}
                    pattern={/^\d*\.?\d*$/}
                    maximum={100}
                  />
                  <div className="opacity-50 ml-1">%</div>
                </Row>
              }
            />
            {slippageToleranceState === 'too small' && (
              <div className={`text-[#7e7a2f] text-xs mobile:text-sm`}>Your transaction may fail</div>
            )}
            {slippageToleranceState === 'too large' && (
              <div className={`text-[#7e7a2f] text-xs mobile:text-sm`}>
                Your transaction may be frontrun and result in an unfavorable trade
              </div>
            )}
          </Col>
        </Collapse.Body>
        <Collapse.Face>
          {({ isOpen }) => (
            <Row className="w-full items-center text-xs font-medium text-gray-300 cursor-pointer select-none">
              <div>{isOpen ? 'Show less' : 'More information'}</div>
              <Icon size="xs" heroIconName={isOpen ? 'chevron-up' : 'chevron-down'} className="ml-1" />
            </Row>
          )}
        </Collapse.Face>
      </Collapse>
    </Col>
  )
}

function SwapExpirationTimeClock({
  remainSeconds,
  onReachZeroSeconds
}: {
  remainSeconds: number
  onReachZeroSeconds?: () => void
}) {
  const chainTimeOffset = useConnection((s) => s.chainTimeOffset) ?? 0
  const [restSeconds, setRestSeconds] = useState(Math.max((remainSeconds ?? 0) - chainTimeOffset / 1000, 0))

  useIsomorphicLayoutEffect(() => {
    setRestSeconds(Math.max((remainSeconds ?? 0) - chainTimeOffset / 1000, 0))
  }, [chainTimeOffset, remainSeconds])

  useIsomorphicLayoutEffect(() => {
    if (restSeconds <= 0) {
      onReachZeroSeconds?.()
    }
  }, [restSeconds <= 0])

  const { days, hours, minutes, seconds } = parseDuration(restSeconds * 1000)

  useForceUpdate({
    loop: days ? 60 * 60 * 1000 : hours ? 60 * 1000 : 1 * 1000,
    disable: !remainSeconds,
    disableWhenDocumentInvisiable: false,
    onLoop: () => setRestSeconds((s) => (s > 0 ? s - 1 : s))
  })

  return (
    <div className="inline-block">
      {days
        ? toUTC(Date.now() + chainTimeOffset + restSeconds)
        : hours
          ? `rest: ${hours}h ${minutes}m`
          : minutes
            ? `rest: ${minutes}m ${seconds}s`
            : `rest: ${seconds}s`}
    </div>
  )
}

function SwappingThrough({
  startSymbol,
  middleSymbol,
  endSymbol,
  poolTypes
}: {
  startSymbol: string
  middleSymbol: string
  endSymbol: string
  poolTypes: (string | undefined)[]
}) {
  return (
    <Row className="items-center">
      {startSymbol} <ArrowWithTag tagValue={poolTypes[0]} /> {middleSymbol} <ArrowWithTag tagValue={poolTypes[1]} />
      {endSymbol}
    </Row>
  )
}

function ArrowWithTag({ tagValue }: { tagValue: string | undefined }) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  const getWidth = () => {
    if (ref.current) {
      setWidth(ref.current.clientWidth)
    }
  }

  useEffect(() => {
    getWidth()
    if (!tagValue) setWidth(12)
  }, [tagValue])

  return (
    <div className="relative top-[-15px]" style={{ marginLeft: 4, marginRight: 4, maxHeight: 19 }}>
      <div ref={ref}>
        {tagValue ? (
          <Badge className="justify-center text-[8px] px-1">{tagValue}</Badge>
        ) : (
          <div style={{ height: 19, width: 12 }}></div>
        )}
      </div>

      <Arrow className="" width={width} />
    </div>
  )
}

function Arrow({ className, width }: { className: string; width: number }) {
  return (
    <div className={twMerge('flex flex-col justify-start mt-[-2px] items-end', className)}>
      <svg width={width} height={15} viewBox={`0 0 ${width} 15`}>
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="3.5" refY="4.5" orient="auto">
            <path d="M3.5,4.5 L2,7 L7,4.5 L2,2 L3.5,4.5" fill="white" />
          </marker>
        </defs>

        <path
          d={`M0,7 H${width - 5}`}
          vectorEffect="non-scaling-stroke"
          stroke="white"
          strokeWidth="1.25px"
          fill="none"
          markerEnd="url(#arrow)"
        />
      </svg>
    </div>
  )
}

function SwapCardItem({
  className,
  fieldName,
  fieldValue,
  tooltipContent,
  fieldNameTextColor,
  fieldValueTextColor
}: {
  className?: string
  fieldName?: string
  fieldValue?: ReactNode
  tooltipContent?: ReactNode
  fieldNameTextColor?: string // for price impact warning color
  fieldValueTextColor?: string // for price impact warning color
}) {
  return (
    <Row className={twMerge('w-full justify-between', className)}>
      <Row className="items-center text-xs font-medium text-color" style={{ color: fieldNameTextColor }}>
        <div className="mr-1">{fieldName}</div>
        {tooltipContent && (
          <Tooltip className={className} placement="bottom-right">
            <Icon size="xs" heroIconName="question-mark-circle" className="cursor-help" />
            <Tooltip.Panel>
              <div className="max-w-[30em]">{tooltipContent}</div>
            </Tooltip.Panel>
          </Tooltip>
        )}
      </Row>
      <div className="text-xs font-medium text-color text-right" style={{ color: fieldValueTextColor }}>
        {fieldValue}
      </div>
    </Row>
  )
}

function SwapCardTooltipPanelAddress() {
  const coin1 = useAggregator((s) => s.coin1)
  const coin2 = useAggregator((s) => s.coin2)
  // const selectedCalcResult = useAggregator((s) => s.selectedCalcResult)
  // const currentPoolKeys = selectedCalcResult?.poolKey

  return (
    <div className="w-60">
      <div className="text-sm font-semibold mb-2">Addresses</div>
      <Col className="gap-2">
        <SwapCardTooltipPanelAddressItem
          label={coin1?.symbol ?? '--'}
          type="token"
          address={String(coin1?.mint ?? '--')}
        />
        <SwapCardTooltipPanelAddressItem
          label={coin2?.symbol ?? '--'}
          type="token"
          address={String(coin2?.mint ?? '--')}
        />
        {/* show routes address panel */}
      </Col>
    </div>
  )
}

function SwapCardTooltipPanelAddressItem({
  className,
  label,
  address,
  type = 'account'
}: {
  className?: string
  label: string
  address: string
  /** this is for site:solscan check */
  type?: 'token' | 'account'
}) {
  return (
    <Row className={twMerge('grid gap-2 items-center grid-cols-[5em,1fr,auto,auto]', className)}>
      <div className="text-xs font-normal text-color">{label}</div>
      <AddressItem
        showDigitCount={5}
        addressType={type}
        canCopy
        canExternalLink
        textClassName="flex text-xs font-normal text-color bg-field rounded justify-center"
      >
        {address}
      </AddressItem>
    </Row>
  )
}

function KLineChart() {
  const coin1 = useAggregator((s) => s.coin1)
  const coin2 = useAggregator((s) => s.coin2)
  const directionReversed = useAggregator((s) => s.directionReversed)

  const kline1Box = useRef<HTMLDivElement>(null)
  const kline2Box = useRef<HTMLDivElement>(null)

  const [hasUISwrapped, { toggleSwap: toggleUISwap, resetSwapPosition }] = useSwapTwoElements(kline1Box, kline2Box, {
    defaultHasWrapped: directionReversed
  })

  useEffect(() => {
    const klin1BoxHaveHeight = Boolean(kline1Box.current?.clientHeight)
    const klin2BoxHaveHeight = Boolean(kline2Box.current?.clientHeight)
    if (hasUISwrapped !== directionReversed && klin1BoxHaveHeight && klin2BoxHaveHeight) {
      toggleUISwap()
    }
  }, [directionReversed])

  const [isLine1BoxReady, setIsLine1BoxReady] = useState(false)
  const [isLine2BoxReady, setIsLine2BoxReady] = useState(false)

  const availableLength = shakeFalsyItem([isLine1BoxReady, isLine2BoxReady]).length

  useRecordedEffect(
    ([prevAvailableLength]) => {
      if (availableLength < (prevAvailableLength ?? 0)) {
        resetSwapPosition()
      }
    },
    [availableLength]
  )
  return (
    <Card
      className={`flex ${isLine1BoxReady || isLine2BoxReady ? 'visible' : 'invisible'
        } flex-col mt-10 p-2 w-[min(456px,100%)] self-center bg-light-card-bg`}
      size="lg"
    >
      <div ref={kline1Box}>
        <KLineChartItem coin={coin1} onDataChange={(isReady) => setIsLine1BoxReady(isReady)} />
      </div>
      <div ref={kline2Box}>
        {coin2?.mintString !== coin1?.mintString && (
          <KLineChartItem coin={coin2} onDataChange={(isReady) => setIsLine2BoxReady(isReady)} />
        )}
      </div>
    </Card>
  )
}

function KLineChartItem({
  coin,
  onDataChange
}: {
  coin: SplToken | undefined
  onDataChange?: (isReady: boolean) => void
}) {
  const blackListTokenMint = [toPubString(USDCMint), toPubString(USDTMint)]
  const isMobile = useAppSettings((s) => s.isMobile)
  const refreshCount = useAggregator((s) => s.refreshCount)
  const apiPrices = useToken((s) => s.tokenPrices)

  const pricePoints = useAsyncMemo(
    async () =>
      coin?.extensions?.coingeckoId ? await getCoingeckoChartPriceData(coin?.extensions?.coingeckoId) : undefined,
    [coin, refreshCount]
  )

  const startPrice = pricePoints?.[0]
  const endPrice = pricePoints?.[pricePoints.length - 1]
  const tokenPrices = (coin && apiPrices[coin?.mintString]) ?? endPrice
  const floatPercent = isMeaningfulNumber(startPrice) && endPrice ? (endPrice - startPrice) / startPrice : 0
  const isPositive = floatPercent > 0
  const isNegative = floatPercent < 0

  const canShowKline = Boolean(coin && !blackListTokenMint.includes(coin.mintString) && pricePoints?.length)

  // clean onDataChange
  useEffect(() => () => onDataChange?.(false), [])

  useEffect(() => {
    onDataChange?.(canShowKline)
  }, [canShowKline])

  return (
    <FadeIn>
      {canShowKline && (
        <div className="flex mobile:grid mobile:grid-cols-3 mobile:gap-1 p-4 mobile:p-2 w-[min(456px,100%)] self-center items-center">
          <Row className="items-center mobile:justify-self-center w-16 mobile:w-8 flex-shrink-0">
            <Col className="gap-1 grow  mobile:items-center">
              <CoinAvatar token={coin} size={isMobile ? 'sm' : 'smi'} />
              <div className="font-medium text-sm text-color">{coin?.symbol ?? '--'}</div>
            </Col>
            {/* <div className="ml-6 self-stretch border-l-1.5 border-[rgba(171,196,255,0.5)]"></div> */}
          </Row>

          <Col className="items-end mobile:items-center mobile:justify-self-center mobile:ml-0 grow">
            <div className="text-xs font-medium text-gray-300">Price</div>
            <div className="text-sm font-medium text-color whitespace-nowrap">
              {'$' +
                formatNumber(tokenPrices?.toFixed(lt(tokenPrices, 0.1) ? coin?.decimals ?? 4 : 2), {
                  fractionLength: 'auto'
                }) ?? '--'}
            </div>
          </Col>

          <Col className="items-start mobile:items-center mobile:justify-self-center ml-8  mobile:ml-0 w-8">
            <div className="text-xs font-medium text-gray-300">24H%</div>
            <div
              className={`text-sm font-medium ${isPositive ? 'text-color' : isNegative ? 'text-[#f04a44]' : 'text-color'
                }`}
            >
              {toPercentString(floatPercent, { alwaysSigned: true })}
            </div>
          </Col>
          <KLineChartItemThumbnail
            className="ml-10 w-36 mobile:w-full h-12 mobile:col-span-full  mobile:m-0 mobile:mt-2 flex-shrink-0"
            isPositive={isPositive}
            isNegative={isNegative}
            pricePoints={pricePoints!}
          />
        </div>
      )}
    </FadeIn>
  )
}

function KLineChartItemThumbnail({
  className,
  isPositive,
  isNegative,
  pricePoints
}: {
  className: string
  isPositive: boolean
  isNegative: boolean
  pricePoints: number[]
}) {
  const lineColor = isPositive ? '#D0D0D8' : isNegative ? '#f04a44' : '#abc4ff'

  const maxPrice = Math.max(...pricePoints)
  const minPrice = Math.min(...pricePoints)
  const diff = maxPrice - minPrice
  const xLength = pricePoints.length

  function getPriceYPoint(p: number) {
    const minH = 0.1 * maxPrice
    if (diff > minH) {
      return ((diff - (p - minPrice)) / diff) * 1000
    } else {
      return 1000 - (((minH - diff) / 2 + (p - minPrice)) * 1000) / minH
    }
  }

  return (
    <svg className={className} viewBox={`0 0 2000 1000`} preserveAspectRatio="none">
      <defs>
        <filter id={`k-line-glow-${isPositive ? 'positive' : isNegative ? 'negative' : 'normal'}`}>
          <feFlood result="flood" floodColor={lineColor} floodOpacity=".8"></feFlood>
          <feComposite in="flood" result="mask" in2="SourceGraphic" operator="in"></feComposite>
          <feMorphology in="mask" result="dilated" operator="dilate" radius="3"></feMorphology>
          <feGaussianBlur in="dilated" result="blurred" stdDeviation="8"></feGaussianBlur>
          <feMerge>
            <feMergeNode in="blurred"></feMergeNode>
            <feMergeNode in="SourceGraphic"></feMergeNode>
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#k-line-glow-${isPositive ? 'positive' : isNegative ? 'negative' : 'normal'})`}>
        {Boolean(xLength) &&
          (diff ? (
            <polyline
              vectorEffect="non-scaling-stroke"
              points={pricePoints
                .map((p, i) => {
                  const y = getPriceYPoint(p)
                  const x = (i / xLength) * 2000
                  return `${x},${y}`
                })
                .join(' ')}
              stroke={lineColor}
              fill="none"
            />
          ) : (
            <line
              x1="0"
              y1="499.9" // filter will not render 0 height, so have to let it a little diff from end point's y
              x2="2000"
              y2="500"
              stroke={lineColor}
              fill="none"
              strokeWidth="16"
            ></line>
          ))}
      </g>
    </svg>
  )
}
