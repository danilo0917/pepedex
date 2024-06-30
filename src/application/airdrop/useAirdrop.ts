import { create } from 'zustand'

export interface IAirdropInfo {
  public_key: string,
  stake_amount: number
}

type AirdropStore = {
  stakeInfo: IAirdropInfo[] | unknown[]
}

const useAirdrop = create<AirdropStore>((set, get) => ({
  stakeInfo: []
}))

export default useAirdrop
