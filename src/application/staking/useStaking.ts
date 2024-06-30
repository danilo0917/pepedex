import { create } from 'zustand'

import { HydratedFarmInfo } from '../farms/type'
import { Program, web3 } from '@project-serum/anchor'
import { Staking } from '@/programs/types/staking'
import { CustomWalletAdapter } from './walletAdapter'
import { AnchorWallet } from '@solana/wallet-adapter-react'
import { Numberish } from '@/types/constants'

export interface IStakeEntryData {
  stakeBalance: number,
  rewards: number,
  rewardsPerTokenPaid: number,
  timestamp?: Date,
  pendingReward: number
}

export interface IStakePoolData {
  escrow: web3.PublicKey,
  balance: number,
  timestamp: Date,
  rewardsPerSecond: number
}
export interface IPoolData {
  id: number,
  name: string,
  poolId: string,
  isFarmLP: boolean,
  quote: { address: string, decimals: number },
  reward: { address: string, decimals: number },
  poolAddress: string
}
export interface IStakeInfo {
  poolData: IPoolData | undefined,
  stakePoolData: IStakePoolData | undefined,
  stakeEntryData: IStakeEntryData | undefined,
  quoteTokenBalance: Numberish,
  rewardTokenBalance: Numberish
}

type StakingStore = {
  stakeDialogMode: 'deposit' | 'withdraw'
  isStakeDialogOpen: boolean
  stakeDialogInfo: undefined | IStakeInfo
  program: Program<Staking> | undefined,
  adapter: AnchorWallet | undefined,
  info: IStakeInfo[]
}

const useStaking = create<StakingStore>((set, get) => ({
  stakeDialogMode: 'deposit',
  isStakeDialogOpen: false,
  stakeDialogInfo: undefined,
  program: undefined,
  adapter: undefined,
  info: [{
    poolData: undefined,
    stakePoolData: undefined,
    stakeEntryData: undefined,
    quoteTokenBalance: 0,
    rewardTokenBalance: 0,
  }]
}))

export default useStaking
