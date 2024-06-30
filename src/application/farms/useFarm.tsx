import { create } from 'zustand'

import useLocalStorageItem from '@/hooks/useLocalStorage'

import useToken from '../token/useToken'
import { HexAddress } from '@/types/constants'
import { APIRewardInfo } from './type'


export interface FarmPoolJsonInfo {
  id: number
  symbol: string
  lpAddress: string
  extUrl: string
  token0: string
  token1: string
  poolType: string
  tvl: number
  apy?: string
  volume?: number

  programId?: string

  authority?: string
  creator?: HexAddress
  rewardInfos?: APIRewardInfo[]
}

export type FarmStore = {
  /** detect if hydratedInfo is ready */
  isLoading: boolean
  jsonInfos: FarmPoolJsonInfo[] // TODO: switch to Object key value pair, for faster extracting
  /**
   * front-end customized farm id list
   * expanded collapse items
   */
  expandedItemIds: Set<string>

  searchText: string

  blockSlotCount: number

  // do not care it's value, just trigger React refresh
  farmRefreshCount: number
  refreshFarmInfos(): void
}

const useFarms = create<FarmStore>((set, get) => ({
  isLoading: true,
  jsonInfos: [],

  expandedItemIds: new Set(),
  searchText: '',

  blockSlotCount: 2,

  farmRefreshCount: 0,
  refreshFarmInfos: () => {
    set({ farmRefreshCount: get().farmRefreshCount + 1 })
    useToken.getState().refreshTokenPrice()
  }
}))

export const useFarmFavoriteIds = () => useLocalStorageItem<string[], null>('FAVOURITE_FARM_IDS', { emptyValue: null })

export default useFarms
