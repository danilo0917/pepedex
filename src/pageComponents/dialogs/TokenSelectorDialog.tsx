import { useCallback, useDeferredValue, useMemo, useState } from 'react'

import { PublicKeyish } from '@raydium-io/raydium-sdk'

import useAppSettings from '@/application/common/useAppSettings'
import useNotification from '@/application/notification/useNotification'
import { getOnlineTokenInfo, verifyToken } from '@/application/token/getOnlineTokenInfo'
import { isToken2022 } from '@/application/token/isToken2022'
import {
  QuantumSOLVersionSOL,
  WSOLMint,
  isQuantumSOL,
  isQuantumSOLVersionSOL,
  isQuantumSOLVersionWSOL
} from '@/application/token/quantumSOL'
import { SplToken } from '@/application/token/type'
import useToken, { SupportedTokenListSettingName } from '@/application/token/useToken'
import { createSplToken } from '@/application/token/useTokenListsLoader'
import { ECATMint, USDCMint, USDTMint } from '@/application/token/wellknownToken.config'
import useWallet from '@/application/wallet/useWallet'
import { AddressItem } from '@/components/AddressItem'
import { Token2022Badge } from '@/components/Badge'
import Button from '@/components/Button'
import Card from '@/components/Card'
import CoinAvatar from '@/components/CoinAvatar'
import Col from '@/components/Col'
import Icon from '@/components/Icon'
import Image from '@/components/Image'
import Input from '@/components/Input'
import InputBox from '@/components/InputBox'
import List from '@/components/List'
import ListFast from '@/components/ListFast'
import ResponsiveDialogDrawer from '@/components/ResponsiveDialogDrawer'
import Row from '@/components/Row'
import Switcher from '@/components/Switcher'
import { throttle } from '@/functions/debounce'
import toPubString from '@/functions/format/toMintString'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { toString } from '@/functions/numberish/toString'
import { searchItems } from '@/functions/searchItems'
import useAsyncValue from '@/hooks/useAsyncValue'
import { useEvent } from '@/hooks/useEvent'
import useToggle from '@/hooks/useToggle'

export type TokenSelectorProps = {
  open: boolean
  onClose?: () => void
  onSelectToken?: (token: SplToken) => unknown
  disableTokens?: (SplToken | PublicKeyish)[]
  turnOnTokenVerification?: boolean // for prevent user select rubbish token
  enableTokens?: SplToken[]
  /**
   * if it select WSOL it can also select SOL, if it select SOL, can also select WSOL\
   * usually used with `disableTokens`
   */
  canSelectQuantumSOL?: boolean
  /** even it's hasFeeze === true, when it's a whiteList token, it still can select */
  canSelectIfInWhiteList?: boolean
}

export default function TokenSelectorDialog(props: TokenSelectorProps) {
  return (
    <ResponsiveDialogDrawer
      maskNoBlur
      transitionSpeed="fast"
      placement="from-top"
      open={props.open}
      onClose={props.onClose}
    >
      {({ close: closePanel }) => <TokenSelectorDialogContent {...props} onClose={closePanel} />}
    </ResponsiveDialogDrawer>
  )
}

function TokenSelectorDialogContent({
  open,
  onClose: closePanel,
  onSelectToken,
  enableTokens,
  turnOnTokenVerification,
  disableTokens,
  canSelectQuantumSOL,
  canSelectIfInWhiteList
}: TokenSelectorProps) {
  const tokenListSettings = useToken((s) => s.tokenListSettings)
  const getToken = useToken((s) => s.getToken)

  const isMobile = useAppSettings((s) => s.isMobile)
  const balances = useWallet((s) => s.balances)

  const [searchText, setSearchText] = useState('')
  const logWarning = throttle(useNotification.getState().logWarning)

  // used for if panel is not tokenList but tokenlistList
  const [currentTabIsTokenList, { off, on }] = useToggle()

  const closeAndClean = useEvent(() => {
    setSearchText('')
    closePanel?.()
  })
  const selectToken = useEvent(async (splToken: SplToken) => {
    const isOfficialToken = tokenListSettings['Raydium Token List'].mints?.has(splToken.mintString)
    // tokenListSettings['Solana Token List'][splToken.mintString]
    const canSelect =
      turnOnTokenVerification && !isOfficialToken
        ? await verifyToken(splToken.mint, { canWhiteList: canSelectIfInWhiteList })
        : true
    if (canSelect) {
      onSelectToken?.(splToken)
      setTimeout(() => {
        closeAndClean()
      }, 200) // delay: give user some time to reflect the change
    } else {
      closeAndClean()
    }
  })

  function isTokenDisabled(candidateToken: SplToken): boolean {
    if (enableTokens) return !enableTokens.some((token) => token.mint.equals(candidateToken.mint))
    return disableTokens
      ? disableTokens.some((disableToken) => {
        if (canSelectQuantumSOL && isQuantumSOL(disableToken)) {
          if (isQuantumSOLVersionSOL(disableToken) && isQuantumSOLVersionSOL(candidateToken)) return true
          if (isQuantumSOLVersionWSOL(disableToken) && isQuantumSOLVersionWSOL(candidateToken)) return true
          return false
        }
        return isMintEqual(disableToken, candidateToken)
      })
      : false
  }

  const allSelectableTokens = useToken((s) => s.allSelectableTokens)

  const verboseTokens = useToken((s) => s.verboseTokens)
  const userAddedTokens = useToken((s) => s.userAddedTokens)

  const sourceTokens = enableTokens || allSelectableTokens
  const userHoldedTokenMints = useMemo(() => new Set(Object.keys(balances)), [balances])

  // used for not search
  const sortedTokens = useCallback(
    () => (disableTokens?.length ? sourceTokens.filter((token) => !isTokenDisabled(token)) : sourceTokens),
    [sourceTokens, disableTokens]
  )
  // used for search
  const allTokens = useCallback(
    () =>
      disableTokens?.length
        ? verboseTokens.concat(Object.values(userAddedTokens)).filter((token) => !isTokenDisabled(token))
        : verboseTokens.concat(Object.values(userAddedTokens)),
    [verboseTokens, userAddedTokens]
  )

  const isTokenUnnamedAndNotUserCustomized = useToken((s) => s.isTokenUnnamedAndNotUserCustomized)
  // by user's search text
  const originalSearchedTokens = useMemo(
    () =>
      searchText
        ? searchItems(allTokens(), {
          text: searchText,
          matchConfigs: (i) => [
            { text: i.id, entirely: true },
            { text: i?.mintString, entirely: true },
            !isTokenUnnamedAndNotUserCustomized(i.mint) ? i.symbol : undefined,
            !isTokenUnnamedAndNotUserCustomized(i.mint) ? i.name : undefined
          ]
        }).sort((a, b) => {
          const aIsUserHolded = userHoldedTokenMints.has(a.mintString)
          const bIsUserHolded = userHoldedTokenMints.has(b.mintString)
          if (!aIsUserHolded && bIsUserHolded) return 1
          if (aIsUserHolded && !bIsUserHolded) return -1
          return 0
        })
        : sortedTokens(),
    [searchText, sortedTokens, allTokens, balances]
  )

  const searchedTokens = useDeferredValue(originalSearchedTokens)

  // flag for can start user add mode
  const haveSearchResult = searchedTokens.length > 0

  const onlineTokenMintInfo = useAsyncValue(
    !haveSearchResult && searchText ? getOnlineTokenInfo(searchText).catch(() => undefined) : undefined,
    undefined,
    [searchText, haveSearchResult]
  )

  // some keyboard (arrow up/down / mouse hover) will change the selected index
  const [selectedTokenIdx, setSelectedTokenIdx] = useState(0)

  const [userCustomizedTokenInfo, setUserCustomizedTokenInfo] = useState({
    symbol: '',
    name: ''
  })

  const cachedTokenList = useMemo(
    // cache for react useDeferredValue
    // "If you want to prevent a child component from re-rendering during an urgent update, you must also memoize that component with React.memo or React.useMemo:" ---- React official doc
    () => (
      <ListFast
        className="flex-grow flex flex-col px-4 mobile:px-2 mx-2 gap-2 overflow-auto my-2"
        sourceData={searchedTokens}
        getKey={(token) => (isQuantumSOLVersionSOL(token) ? token.symbol : token.mintString) ?? token.mintString}
        renderItem={(token, idx) => (
          <div>
            <Row
              className={`${selectedTokenIdx === idx
                ? 'clickable no-clicable-transform-effect clickable-mask-offset-2 before-bg-navbar'
                : ''
                }`}
              onHoverChange={({ is: hoverStatus }) => {
                if (hoverStatus === 'start') {
                  setSelectedTokenIdx(idx)
                }
              }}
            >
              <TokenSelectorDialogTokenItem
                onClick={() => {
                  selectToken(token)
                }}
                token={token}
              />
            </Row>
          </div>
        )}
      />
    ),
    [searchedTokens, selectedTokenIdx, setSelectedTokenIdx]
  )
  const connected = useWallet((s) => s.connected)

  const recordUserAddedToken = (info: { symbol: string; name: string }): void => {
    if (!info.symbol) return
    const { addUserAddedToken } = useToken.getState()
    const decimals = onlineTokenMintInfo?.decimals
    const hasFreeze = Boolean(onlineTokenMintInfo?.freezeAuthority)
    if (!onlineTokenMintInfo || decimals === undefined) {
      logWarning(`the mint address is invalid`)
      return
    }
    const newToken = createSplToken({
      mint: searchText,
      symbol: info.symbol.slice(0, 8),
      decimals,
      icon: '',
      extensions: {},
      name: info.name ? info.name.slice(0, 16) : info.symbol.slice(0, 16),
      userAdded: true,
      hasFreeze,
      isToken2022: onlineTokenMintInfo.is2022Token
    })
    addUserAddedToken(newToken)
  }
  return (
    <Card
      className="flex flex-col rounded-3xl mobile:rounded-none w-[min(468px,100vw)] mobile:w-full h-[min(680px,100vh)] mobile:h-screen border-1.5 border-[rgba(99,130,202,0.2)] bg-light-card-bg shadow-cyberpunk-card"
      size="lg"
      htmlProps={{
        onKeyDown: (e) => {
          if (e.key === 'ArrowUp') {
            setSelectedTokenIdx((s) => Math.max(s - 1, 0))
          } else if (e.key === 'ArrowDown') {
            setSelectedTokenIdx((s) => Math.min(s + 1, searchedTokens.length - 1))
          } else if (e.key === 'Enter') {
            const token = searchedTokens[selectedTokenIdx]
            token && selectToken(token)
          }
        }
      }}
    >
      {currentTabIsTokenList ? (
        <div className="px-8 mobile:px-6 pt-6 pb-5">
          <Row className="justify-between items-center mb-6">
            <Icon
              className="text-color cursor-pointer clickable clickable-mask-offset-2"
              heroIconName="chevron-left"
              onClick={off}
            />
            <div className="text-xl font-semibold text-color">Token List Settings</div>
            <div></div>
          </Row>
          <List
            items={Object.entries(tokenListSettings).map(([name]) => name as SupportedTokenListSettingName)}
            getItemKey={(item) => item}
            className="p-2 grid mt-2 overflow-auto max-h-[70vh]"
          >
            {(availableTokenListName) => <TokenSelectorDialogTokenListItem tokenListName={availableTokenListName} />}
          </List>
        </div>
      ) : (
        <>
          <div className="px-8 mobile:px-6 pt-6 pb-5">
            <Row className="justify-between items-center mb-6">
              <div className="text-xl font-semibold text-color">Select a token</div>
              <Icon
                className="text-color cursor-pointer clickable clickable-mask-offset-2"
                heroIconName="x"
                onClick={closeAndClean}
              />
            </Row>

            <Input
              value={searchText}
              placeholder="Search name or mint address"
              onUserInput={(text) => {
                setSearchText(text)
                setSelectedTokenIdx(0)
              }}
              className="py-3 px-4 rounded-xl bg-field"
              inputClassName="placeholder-[rgb(255,255,255)] text-sm text-color"
              labelText="input for searching coins"
              suffix={<Icon heroIconName="search" size="sm" className="text-color" />}
            />

            <div className="text-xs font-medium text-color-secondary my-3">Popular tokens</div>

            <Row className="justify-between">
              {([ECATMint, QuantumSOLVersionSOL, USDTMint, USDCMint] as const).map((mintish, idx) => {
                const token = isQuantumSOL(mintish) ? QuantumSOLVersionSOL : getToken(mintish)
                return (
                  <Row
                    key={toPubString(isQuantumSOL(mintish) ? mintish.mint : mintish)}
                    className={`gap-1 py-1 px-2 mobile:py-1.5 mobile:px-2.5 rounded ring-1 ring-inset ring-[rgba(171,196,255,.3)] items-center flex-wrap ${token?.mint && isTokenDisabled(token) ? 'not-clickable' : 'clickable clickable-filter-effect'
                      }`}
                    onClick={() => {
                      if (token && isTokenDisabled(token)) return
                      if (token) selectToken(token)
                    }}
                  >
                    <CoinAvatar size={isMobile ? 'xs' : 'sm'} token={token} />
                    <div className="text-base mobile:text-sm font-normal text-color">{token?.symbol ?? '--'}</div>
                  </Row>
                )
              })}
            </Row>
          </div>

          <div className="mobile:mx-6 border-t-1.5 border-gray"></div>

          <Col className="flex-1 overflow-hidden border-b-1.5 py-3 border-gray">
            <Row className="px-8 mobile:px-6 justify-between">
              <div className="text-xs font-medium text-color-secondary">Token</div>
              <Row className="text-xs font-medium text-color-secondary items-center gap-1">
                Balance / Address
              </Row>
            </Row>
            {haveSearchResult ? (
              cachedTokenList
            ) : onlineTokenMintInfo && toPubString(WSOLMint) !== searchText ? (
              <Col className="p-8  gap-4">
                <InputBox
                  label="input a symbol for this token"
                  onUserInput={(e) => {
                    setUserCustomizedTokenInfo((prev) => ({ ...prev, symbol: e }))
                  }}
                />
                <InputBox
                  label="input a name for this token (optional)"
                  onUserInput={(e) => {
                    setUserCustomizedTokenInfo((prev) => ({ ...prev, name: e }))
                  }}
                />
                <Button
                  className="frosted-glass-teal"
                  onClick={() => {
                    recordUserAddedToken(userCustomizedTokenInfo)
                  }}
                  validators={[
                    {
                      should: connected,
                      forceActive: true,
                      fallbackProps: {
                        onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
                        children: 'Connect Wallet'
                      }
                    },
                    { should: userCustomizedTokenInfo.symbol }
                  ]}
                >
                  Add User Token
                </Button>
              </Col>
            ) : null}
          </Col>

          <Button type="text" className="w-full py-4 rounded-none font-bold text-xs text-color" onClick={on}>
            View Token List
          </Button>
        </>
      )}
    </Card>
  )
}

function TokenSelectorDialogTokenItem({ token, onClick }: { token: SplToken; onClick?(): void }) {
  const userFlaggedTokenMints = useToken((s) => s.userFlaggedTokenMints)
  const canFlaggedTokenMints = useToken((s) => s.canFlaggedTokenMints)
  const userAddedTokens = useToken((s) => s.userAddedTokens)
  const tokens = useToken((s) => s.tokens)
  const isUserAddedToken = Boolean(userAddedTokens[token.mintString])
  const toggleFlaggedToken = useToken((s) => s.toggleFlaggedToken)
  const deleteUserAddedToken = useToken((s) => s.deleteUserAddedToken)
  const editUserAddedToken = useToken((s) => s.editUserAddedToken)
  const getBalance = useWallet((s) => s.getBalance)
  const connected = useWallet((s) => s.connected)

  const [showUpdateInfo, setShowUpdateInfo] = useState(false)
  const [userCustomizedTokenInfo, setUserCustomizedTokenInfo] = useState({
    symbol: token.symbol || '',
    name: token.name || ''
  })

  const balance = getBalance(token)
  return (
    <div className="group w-full">
      <Row onClick={onClick} className="group w-full gap-4 justify-between items-center p-2">
        <Row>
          <CoinAvatar token={token} className="mr-2" />
          <Col className="mr-2">
            <Row>
              <Row className="items-center gap-1">
                <div className="text-base  max-w-[7em] overflow-hidden text-ellipsis  font-normal text-color">
                  {token.symbol}
                </div>
                {isToken2022(token) && <Token2022Badge pale />}
              </Row>
              {isUserAddedToken ? (
                <Row
                  onClick={(ev) => {
                    deleteUserAddedToken(token.mint)
                    ev.stopPropagation()
                  }}
                  className="group-hover:flex hidden items-center text-sm mobile:text-xs text-[#1464ed] font-medium flex-nowrap px-2 gap-1"
                >
                  <Icon className="w-4 h-4" iconClassName="w-4 h-4" iconSrc="/icons/delete-token.svg" />
                  <div className="whitespace-nowrap">Delete Token</div>
                </Row>
              ) : null}
            </Row>
            <div className="text-xs  max-w-[12em] overflow-hidden text-ellipsis whitespace-nowrap  font-medium text-color-secondary">
              {token.name}
            </div>
          </Col>
          {/* {canFlaggedTokenMints.has(token.mintString) ? (
            <div
              onClick={(ev) => {
                toggleFlaggedToken(token)
                ev.stopPropagation()
              }}
              className="group-hover:visible invisible inline-block text-sm mobile:text-xs text-[#1464ed]  p-2 "
            >
              {userFlaggedTokenMints.has(token.mintString) ? '[Remove Token]' : '[Add Token]'}
            </div>
          ) : null} */}
          {/* {isUserAddedToken && !canFlaggedTokenMints.has(token.mintString) ? (
            <>
              <div
                onClick={(ev) => {
                  deleteUserAddedToken(token.mint)
                  ev.stopPropagation()
                }}
                className="group-hover:visible invisible inline-block text-sm mobile:text-xs text-[#1464ed]  p-2 "
              >
                [Delete Token]
              </div>
              <div
                onClick={(ev) => {
                  setShowUpdateInfo((p) => !p)
                  ev.stopPropagation()
                }}
                className="group-hover:visible invisible inline-block text-sm mobile:text-xs text-[#1464ed]  p-2 "
              >
                [Edit Token]
              </div>
            </>
          ) : null}
          {isCustomTokenSymbolName ? (
            <div
              onClick={(ev) => {
                setShowUpdateCustomSymbol((p) => !p)
                ev.stopPropagation()
              }}
              className="group-hover:visible invisible mobile:group-hover:block mobile:hidden inline-block text-sm mobile:text-xs text-[#1464ed]  p-2 "
            >
              [Edit Token]
            </div>
          ) : null} new 🚑 no need */}
        </Row>
        <Col className="self-stretch items-end">
          {balance && (
            <div className="grow  text-sm text-color justify-self-end">
              {toString(balance?.toExact?.(), { decimalLength: 'auto 2' })}
            </div>
          )}
          <AddressItem
            className="grow"
            showDigitCount={5}
            addressType="token"
            showCopyIcon={false}
            canExternalLink
            iconSize={'sm'}
            textClassName="flex leading-[normal] text-2xs self-center px-1.5 py-0.5 border border-[#abc4ff] rounded-sm text-color justify-center"
            iconClassName="text-color"
            iconRowClassName="ml-1.5 gap-0.5"
          >
            {token.mintString}
          </AddressItem>
        </Col>
      </Row>
      {showUpdateInfo && (
        <Col className="p-1  gap-4">
          <InputBox
            value={userCustomizedTokenInfo.symbol}
            label="input a symbol for this token"
            onUserInput={(e) => {
              setUserCustomizedTokenInfo((prev) => ({ ...prev, symbol: e }))
            }}
          />
          <InputBox
            value={userCustomizedTokenInfo.name}
            label="input a name for this token (optional)"
            onUserInput={(e) => {
              setUserCustomizedTokenInfo((prev) => ({ ...prev, name: e }))
            }}
          />
          <Button
            className="frosted-glass-teal"
            onClick={() => {
              editUserAddedToken(userCustomizedTokenInfo, token.mint)
              setShowUpdateInfo(false)
            }}
            validators={[
              {
                should: connected,
                forceActive: true,
                fallbackProps: {
                  onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
                  children: 'Connect Wallet'
                }
              },
              { should: userCustomizedTokenInfo.symbol }
            ]}
          >
            Confirm
          </Button>
        </Col>
      )}
    </div>
  )
}

function TokenSelectorDialogTokenListItem({ tokenListName }: { tokenListName: SupportedTokenListSettingName }) {
  const tokenListSettings = useToken((s) => s.tokenListSettings)
  const tokenList = tokenListSettings[tokenListName]
  const isOn = tokenListSettings[tokenListName].isOn
  const disableUserConfig = tokenListSettings[tokenListName].disableUserConfig
  const toggleTokenListName = () => {
    useToken.setState((s) => ({
      tokenListSettings: {
        ...s.tokenListSettings,
        [tokenListName]: {
          ...s.tokenListSettings[tokenListName],
          isOn: !s.tokenListSettings[tokenListName].isOn
        }
      }
    }))
  }
  if (!tokenList.mints?.size) return null
  if (tokenList.cannotbBeSeen) return null
  return (
    <Row className="my-4 items-center">
      {tokenList?.icon && <Image className="rounded-full h-8 w-8 overflow-hidden" src={tokenList.icon} />}

      <Col>
        <div className="text-base font-normal text-color">{tokenListName}</div>
        {tokenList && (
          <div className="text-sm font-medium text-color-secondary">{tokenList.mints?.size ?? '--'} tokens</div>
        )}
      </Col>

      <Switcher disable={disableUserConfig} className="ml-auto" defaultChecked={isOn} onToggle={toggleTokenListName} />
    </Row>
  )
}
