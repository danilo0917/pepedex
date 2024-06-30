import { calculateStakeEntryPda } from "@/programs/staking/pda";
import { stakings } from "./staking";
import useStaking, { IStakeEntryData, IStakeInfo, IStakePoolData } from "./useStaking";
import { BN, Program, web3 } from "@project-serum/anchor";
import useWallet from '@/application/wallet/useWallet';
import { PublicKey } from "@solana/web3.js";
import { Staking } from "@/programs/types/staking";
import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import { useEffect } from "react";

export default async function useStakingLoad() {
  const program = useStaking((s) => s.program)
  const adapter = useStaking((s) => s.adapter)
  const { connection } = useConnection()

  useEffect(() => {
        const fetchStaking = async () => {
          if (adapter) {
            const infos = await Promise.all(stakings.map(async (s) => {
              const stakingPoolData = await fetchStakePoolData(program, s.poolAddress, s.quote.decimals)
              const stakingEntryData = await fetchStakeEntryData(program, adapter.publicKey, s.poolAddress, s.quote.decimals, s.reward.decimals)
              const quoteTokenBalance = await fetchTokenData(new web3.PublicKey(s.quote.address), adapter.publicKey, connection, s.quote.decimals)
              const rewardTokenBalance = await fetchTokenData(new web3.PublicKey(s.reward.address), adapter.publicKey, connection, s.reward.decimals)
              const isFarmLP = s.isFarmLP
              return { poolData: s, stakePoolData: stakingPoolData, stakeEntryData: stakingEntryData, quoteTokenBalance: quoteTokenBalance, rewardTokenBalance: rewardTokenBalance, isFarmLP: isFarmLP } as IStakeInfo
            }))
            useStaking.setState({
              info: infos
            })
          } else {
            const infos = await Promise.all(stakings.map(async (s) => {
              const stakingPoolData = await fetchStakePoolData(program, s.poolAddress, s.quote.decimals)
              return { poolData: s, stakePoolData: stakingPoolData, stakeEntryData: undefined, quoteTokenBalance: 0, rewardTokenBalance: 0 }
            }))
    
            useStaking.setState({
              info: infos
            })
          }
        }
        fetchStaking()
      }, [adapter, connection])
}

async function fetchTokenData(tokenAddress: web3.PublicKey, adapter: web3.PublicKey, connection: web3.Connection, decimals: number) {
  let data = await getTokenAccountNullable(tokenAddress, adapter, connection);
  if (!data) return 0;
  const tokenABalance = Number(data.amount) / Math.pow(10, decimals);
  return tokenABalance
}

async function getTokenAccountNullable(mint: web3.PublicKey, owner: web3.PublicKey, connection: web3.Connection) {
  let associatedAddress = await getAssociatedTokenAddress(mint, owner);
  try {
    let data = await getAccount(connection, associatedAddress);
    return data;
  } catch {
    console.error("get Token Account failed")
  }
  return null;
}

async function fetchStakePoolData(program: Program<Staking> | undefined, poolAddress: string, decimals: number) {
  const pooldData = await program?.account.stakePool.fetchNullable(poolAddress);
  const stakePoolData = {
    escrow: pooldData?.escrowB,
    balance: pooldData && Number(pooldData.balance.toString()) / Math.pow(10, decimals),
    timestamp: pooldData && new Date(Number(pooldData.lastUpdateTimestamp.toString()) * 1000),
    rewardsPerSecond: pooldData && Number(pooldData.rewardsPerSecond.toString()) / Math.pow(10, decimals)
  } as IStakePoolData;
  return stakePoolData
}

async function fetchStakeEntryData(program: Program<Staking> | undefined, adapter: web3.PublicKey, poolAddress: string, decimalA: number, decimalB: number) {
  let stakePoolData = await program?.account.stakePool.fetchNullable(poolAddress);
  let [stakeEntryAddress, _] = await calculateStakeEntryPda(adapter, new web3.PublicKey(poolAddress));
  let fetchEntryData = await program?.account.stakeEntry.fetchNullable(stakeEntryAddress);
  if (fetchEntryData == null) return;
  const pendingReward = await calcEstimatedRewards(program, new web3.PublicKey(poolAddress), stakeEntryAddress, decimalA, decimalB)
  // AppState.stakeEntryAddress = stakeEntryAddress;
  const stakeEntryData = {
    stakeBalance: Number(fetchEntryData.balance.toString()) / Math.pow(10, decimalA),
    rewards: Number(fetchEntryData.rewards.toString()) / Math.pow(10, decimalB),
    rewardsPerTokenPaid: Number(fetchEntryData.rewardsPerTokenPaid.toString()) / Math.pow(10, decimalB),
    pendingReward: pendingReward
  } as IStakeEntryData;

  return stakeEntryData
}

async function calcEstimatedRewards(program: Program<Staking> | undefined, stakePoolAddress: web3.PublicKey, stakeEntryAddress: web3.PublicKey, decimalA: number, decimalB: number) {
  
  let stakePoolData = await program?.account.stakePool.fetchNullable(stakePoolAddress);
  let stakeEntryData = await program?.account.stakeEntry.fetchNullable(stakeEntryAddress);
  if (!stakePoolData || !stakeEntryData) return
  let interval = (Date.now() / 1e3) - Number(stakePoolData.lastUpdateTimestamp.toString());
  let rewardsPerToken = fromTokenAmount(stakePoolData.rewardsPerTokenStored, decimalB) +
    (interval * fromTokenAmount(stakePoolData.rewardsPerSecond, decimalB) / fromTokenAmount(stakePoolData.balance, 6));
  let rewards = fromTokenAmount(stakeEntryData.rewards, decimalB) + (rewardsPerToken - fromTokenAmount(stakeEntryData.rewardsPerTokenPaid, decimalB)) * fromTokenAmount(stakeEntryData.balance, decimalB);
  
  return rewards;
}

function fromTokenAmount(amount: BN, decimals: number) {
  let amountNumber = Number(amount.toString());

  return amountNumber / (10 ** decimals)
}