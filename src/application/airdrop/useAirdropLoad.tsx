import { calculateStakeEntryPda } from "@/programs/staking/pda";
import { BN, Program, web3 } from "@project-serum/anchor";
import useWallet from '@/application/wallet/useWallet';
import { PublicKey } from "@solana/web3.js";
import { Staking } from "@/programs/types/staking";
import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import useAirdrop from "./useAirdrop";
import axios from "axios";

export default async function useAirdropLoad() {

  const stakeInfo = await fetchStakeInfo()
  useAirdrop.setState({
    stakeInfo: stakeInfo
  })
}


async function fetchStakeInfo() {
  try {

    const resp = await axios.get(`https://solx-api.onrender.com/airdrop/getInvestorsData`)
    const stakeInfos = Object.entries(resp.data.transactions).sort((a, b) => Number(b[1]) - Number(a[1]))
    return stakeInfos
  } catch {
    return []
  }
}
