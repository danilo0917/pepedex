import React, { useMemo, useState } from 'react'

import useAppSettings from '@/application/common/useAppSettings'
import useStaking from '@/application/staking/useStaking'
import useWallet from '@/application/wallet/useWallet'
import Button from '@/components/Button'
import toPubString from '@/functions/format/toMintString'
import Card from '@/components/Card'
import CoinInputBox from '@/components/CoinInputBox'
import Icon from '@/components/Icon'
import ResponsiveDialogDrawer from '@/components/ResponsiveDialogDrawer'
import Row from '@/components/Row'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { gt, gte } from '@/functions/numberish/compare'
import { toString } from '@/functions/numberish/toString'
import { toSplToken } from '@/application/token/useTokenListsLoader'
import txStake from '@/application/staking/txStake'
import { web3 } from '@project-serum/anchor'
import { BN } from 'bn.js'
import txUnStake from '@/application/staking/txUnStake'

export function StakingPageStakeLpDialog() {
  const connected = useWallet((s) => s.connected)
  const balances = useWallet((s) => s.balances)
  const tokenAccounts = useWallet((s) => s.tokenAccounts)

  const program = useStaking((s) => s.program)
  const stakeDialogInfo = useStaking((s) => s.stakeDialogInfo)
  const stakeDialogMode = useStaking((s) => s.stakeDialogMode)
  const isStakeDialogOpen = useStaking((s) => s.isStakeDialogOpen)
  const [amount, setAmount] = useState<string>()
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)

  const userHasLp = useMemo(
    () =>
      Boolean(stakeDialogInfo?.poolData?.quote.address) &&
      tokenAccounts.some(({ mint }) => String(mint) === String(stakeDialogInfo?.poolData?.quote.address)),
    [tokenAccounts, stakeDialogInfo]
  )



  const userInputTokenAmount = useMemo(() => {
    if (!stakeDialogInfo?.poolData?.quote.address || !amount) return undefined
    return toTokenAmount(toSplToken(stakeDialogInfo.poolData.name, stakeDialogInfo.poolData.name, stakeDialogInfo.poolData.quote.address, stakeDialogInfo.poolData.quote.decimals), amount, { alreadyDecimaled: true })
  }, [stakeDialogInfo, amount])

  let inputToken;
  let inputTokenAddress, stakePoolAddress;
  let inputTokenDecimal;
  if (stakeDialogInfo && stakeDialogInfo.poolData) {
    inputTokenAddress = stakeDialogInfo.poolData.quote.address
    stakePoolAddress = stakeDialogInfo.poolData.poolAddress
    inputTokenDecimal = stakeDialogInfo.poolData.quote.decimals
    inputToken = toSplToken(stakeDialogInfo.poolData.name, stakeDialogInfo.poolData.name, stakeDialogInfo.poolData.quote.address, stakeDialogInfo.poolData.quote.decimals)
  } else {
    inputToken = undefined
  }

  const targetTokenAccount = tokenAccounts.find((t) => toPubString(t.mint) === toPubString(stakeDialogInfo?.poolData?.quote.address))
  const avaliableTokenAmount = useMemo(
    () =>
      stakeDialogMode === 'deposit'
        ? stakeDialogInfo?.poolData?.quote.address && targetTokenAccount && toTokenAmount(inputToken, targetTokenAccount?.amount)
        : stakeDialogInfo?.stakeEntryData?.stakeBalance,
    [stakeDialogInfo, balances, stakeDialogMode]
  )

  return (
    <ResponsiveDialogDrawer
      open={isStakeDialogOpen}
      onClose={() => {
        setAmount(undefined)
        useStaking.setState({ isStakeDialogOpen: false })
      }}
      placement="from-bottom"
    >
      {({ close }) => (
        <Card
          className="backdrop-filter backdrop-blur-xl p-8 rounded-3xl w-[min(468px,100vw)] mobile:w-full border-1.5 border-gray bg-light-card-bg shadow-cyberpunk-card"
          size="lg"
        >
          {/* {String(info?.lpMint)} */}
          <Row className="justify-between items-center mb-6">
            <div className="text-xl font-semibold text-color">
            {stakeDialogMode === 'withdraw' ? `Hat Comes Off` : `Hat Comes On`}
              {/* {stakeDialogMode === 'withdraw' ? `Unstake ${stakeDialogInfo?.poolData?.name}` : `Stake ${stakeDialogInfo?.poolData?.name}`} */}
            </div>
            <Icon className="text-color cursor-pointer" heroIconName="x" onClick={close} />
          </Row>
          {/* input-container-box */}
          <CoinInputBox
            className="mb-6"
            topLeftLabel={`Locking ${stakeDialogInfo?.poolData?.name}`}
            token={inputToken}
            onUserInput={setAmount}
            maxValue={stakeDialogMode === 'withdraw' ? stakeDialogInfo?.stakeEntryData?.stakeBalance : undefined}
            topRightLabel={
              stakeDialogMode === 'withdraw'
                ? stakeDialogInfo?.stakeEntryData?.stakeBalance
                  ? `Deposited: ${toString(stakeDialogInfo?.stakeEntryData?.stakeBalance)}`
                  : '(no deposited)'
                : undefined
            }
          />
          <Row className="flex-col gap-1">
            <Button
              className="frosted-glass-teal"
              isLoading={isApprovePanelShown}
              validators={[
                { should: connected },
                // { should: stakeDialogInfo?.lp },
                { should: amount },
                { should: gt(userInputTokenAmount, 0) },
                {
                  should: gte(avaliableTokenAmount, userInputTokenAmount),
                  fallbackProps: { children: `Insufficient ${stakeDialogInfo?.poolData?.name} Balance` }
                },
                {
                  should: stakeDialogMode === 'withdraw' ? true : userHasLp,
                  fallbackProps: { children: stakeDialogMode === 'withdraw' ? `No Unstakable ${stakeDialogInfo?.poolData?.name}` : `No Stakable ${stakeDialogInfo?.poolData?.name}` }
                }
              ]}
              onClick={() => {
                if (!inputToken || !amount) return
                const tokenAmount = toTokenAmount(inputToken, amount, { alreadyDecimaled: true })
                  ; (stakeDialogMode === 'withdraw'
                    ? txUnStake(new web3.PublicKey(stakePoolAddress), new BN((parseFloat(amount) * 10 ** inputTokenDecimal).toString()), new web3.PublicKey(inputTokenAddress), inputTokenDecimal, inputToken.name)
                    : program && txStake(program, new web3.PublicKey(stakePoolAddress), new BN((parseFloat(amount) * 10 ** inputTokenDecimal).toString()), new web3.PublicKey(inputTokenAddress), inputTokenDecimal, inputToken.name)
                  )
              }}
            >
              {stakeDialogMode === 'withdraw' ? `Hat Comes Off` : `Hat Comes On`}
              {/* {stakeDialogMode === 'withdraw' ? `Unstake ${stakeDialogInfo?.poolData?.name}` : `Stake ${stakeDialogInfo?.poolData?.name}`} */}
            </Button>
            <Button type="text" disabled={isApprovePanelShown} className="text-sm backdrop-filter-none" onClick={close}>
              Cancel
            </Button>
          </Row>
        </Card>
      )}
    </ResponsiveDialogDrawer>
  )
}
