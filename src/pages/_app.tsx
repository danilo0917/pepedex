import { PublicKey } from '@solana/web3.js'
import { AppProps } from 'next/app'
import { useEffect } from 'react';
import { useRouter } from 'next/router'
import NextNProgress from 'nextjs-progressbar'

import useAutoCleanSwapInfoCache from '@/application/ammV3PoolInfoAndLiquidity/useAutoCleanLiquidityInfoCache'
import { useClientInitialization, useInnerAppInitialization } from '@/application/common/initializationHooks'
import { useAppInitVersionPostHeartBeat, useJudgeAppVersion } from '@/application/common/useAppVersion'
import { useConcentratedAprCalcMethodSyncer } from '@/application/concentrated/useConcentratedAprCalcMethodSyncer'
import useConcentratedInfoLoader from '@/application/concentrated/useConcentratedInfoLoader'
import useConnectionInitialization from '@/application/connection/useConnectionInitialization'
import useFreshChainTimeOffset from '@/application/connection/useFreshChainTimeOffset'
import { useUserCustomizedEndpointInitLoad } from '@/application/connection/useUserCustomizedEndpointInitLoad'
import useFarmInfoLoader from '@/application/farms/useFarmInfoLoad'
import useAutoCleanLiquidityInfoCache from '@/application/liquidity/useAutoCleanLiquidityInfoCache'
import useLiquidityInfoLoader from '@/application/liquidity/useLiquidityInfoLoader'
import useMessageBoardFileLoader from '@/application/messageBoard/useMessageBoardFileLoader'
import useMessageBoardReadedIdRecorder from '@/application/messageBoard/useMessageBoardReadedIdRecorder'
import usePoolsInfoLoader from '@/application/pools/usePoolsInfoLoader'
import useStakingInitializer from '@/application/staking/useStakingInitializer'
import useAutoUpdateSelectableTokens from '@/application/token/useAutoUpdateSelectableTokens'
import useLpTokensLoader from '@/application/token/useLpTokensLoader'
import useTokenMintAutoRecord from '@/application/token/useTokenFlaggedMintAutoRecorder'
import { useTokenGetterFnLoader } from '@/application/token/useTokenGetterFnLoader'
import useTokenListSettingsLocalStorage from '@/application/token/useTokenListSettingsLocalStorage'
import useTokenListsLoader from '@/application/token/useTokenListsLoader'
import useTokenPriceRefresher from '@/application/token/useTokenPriceRefresher'
import useInitRefreshTransactionStatus from '@/application/txHistory/useInitRefreshTransactionStatus'
import useSyncTxHistoryWithLocalStorage from '@/application/txHistory/useSyncTxHistoryWithLocalStorage'
import useInitBalanceRefresher from '@/application/wallet/useBalanceRefresher'
import { useSyncWithSolanaWallet } from '@/application/wallet/useSyncWithSolanaWallet'
import useTokenAccountsRefresher from '@/application/wallet/useTokenAccountsRefresher'
import { useWalletAccountChangeListeners } from '@/application/wallet/useWalletAccountChangeListeners'
import { useWalletConnectNotifaction } from '@/application/wallet/useWalletConnectNotifaction'
import { useWalletTxVersionDetector } from '@/application/wallet/useWalletTxVersionDetector'
import { DRAWER_STACK_ID } from '@/components/Drawer'
import NotificationSystemStack from '@/components/NotificationSystemStack'
import { POPOVER_STACK_ID } from '@/components/Popover'
import { SolanaWalletProviders } from '@/components/SolanaWallets/SolanaWallets'
import { createDOMElement } from '@/functions/dom/createDOMElement'
import toPubString from '@/functions/format/toMintString'
import { inClient } from '@/functions/judgers/isSSR'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect'
import RecentTransactionDialog from '@/pageComponents/dialogs/RecentTransactionDialog'
import WalletSelectorDialog from '@/pageComponents/dialogs/WalletSelectorDialog'
import { setAutoFreeze } from 'immer'

import '../styles/index.css'
import useStakingLoad from '@/application/staking/useStakingLoad'
import useAirdropLoad from '@/application/airdrop/useAirdropLoad'
import useAppSettings from '@/application/common/useAppSettings'

setAutoFreeze(false)
export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const pathname = router.pathname

  useEffect(() => {
    if (pathname === '/') {
      router.replace('/swap');
    }
  }, [pathname]);

  /* add popup stack */
  useIsomorphicLayoutEffect(() => {
    if (inClient) {
      const hasPopoverStack = Boolean(document.getElementById(POPOVER_STACK_ID))
      if (hasPopoverStack) return
      const popoverStackElement = createDOMElement({
        classNames: ['fixed', 'z-popover', 'inset-0', 'self-pointer-events-none'],
        id: POPOVER_STACK_ID
      })
      document.body.append(popoverStackElement)
    }

    if (inClient) {
      const hasDrawerStack = Boolean(document.getElementById(DRAWER_STACK_ID))
      if (hasDrawerStack) return
      const drawerStackElement = createDOMElement({
        classNames: ['fixed', 'z-drawer', 'inset-0', 'self-pointer-events-none'],
        id: DRAWER_STACK_ID
      })
      document.body.append(drawerStackElement)
    }
  }, [])

  return (
    <SolanaWalletProviders>
      {/* initializations hooks */}
      <ClientInitialization />
      <ApplicationsInitializations />

      <div className="app">
        <NextNProgress color="#34ade5" showOnShallow={false} />

        {/* Page Components */}
        <Component {...pageProps} />

        {/* Global Components */}
        <RecentTransactionDialog />
        <WalletSelectorDialog />
        <NotificationSystemStack />
      </div>
    </SolanaWalletProviders>
  )
}

// accelerayte
PublicKey.prototype.toString = function () {
  return toPubString(this)
}
PublicKey.prototype.toJSON = function () {
  return toPubString(this)
}

function ClientInitialization() {
  useClientInitialization()

  return null
}

function ApplicationsInitializations() {
  useInnerAppInitialization()

  /********************** appVersion **********************/
  // useAppInitVersionPostHeartBeat()
  // useJudgeAppVersion()

  /********************** connection **********************/
  useUserCustomizedEndpointInitLoad()
  useConnectionInitialization()
  useFreshChainTimeOffset()

  /********************** message boards **********************/
  // useMessageBoardFileLoader() // load `raydium-message-board.json`
  // useMessageBoardReadedIdRecorder() // sync user's readedIds

  /********************** wallet **********************/

  // experimental features. will not let user see
  // useInitShadowKeypairs()
  useSyncWithSolanaWallet()
  useWalletConnectNotifaction()
  useWalletTxVersionDetector()
  useTokenAccountsRefresher()
  useInitBalanceRefresher()
  useWalletAccountChangeListeners()

  /********************** token **********************/
  // application initializations
  useAutoUpdateSelectableTokens()
  useTokenListsLoader()
  useLpTokensLoader()
  useTokenPriceRefresher()
  useTokenMintAutoRecord()
  useTokenListSettingsLocalStorage()
  useTokenGetterFnLoader()

  /* ----- load liquidity info (jsonInfo, sdkParsedInfo, hydratedInfo) ----- */
  useLiquidityInfoLoader()
  useAutoCleanLiquidityInfoCache()
  useAutoCleanSwapInfoCache()

  /********************** pair Info (pools) **********************/
  // usePoolsInfoLoader()

  /********************** concentrated pools **********************/
  // useConcentratedInfoLoader()
  // useConcentratedAprCalcMethodSyncer()

  /********************** concentrated migration **********************/
  // useCLMMMigrationLoadInfo()

  /********************** farm **********************/
  // useFarmInfoLoader()

  /********************** staking **********************/
  // useStealDataFromFarm() // auto inject apr to farm info from backend pair interface
  useStakingInitializer()
  useStakingLoad()
  // useAirdropLoad()
  /********************** txHistory **********************/
  // useInitRefreshTransactionStatus()
  // useSyncTxHistoryWithLocalStorage()
  useAppSettings.setState({ transactionPriority: 0.00005 })
  return null
}
