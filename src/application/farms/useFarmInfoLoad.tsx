import { useMemo } from 'react'

import { Endpoint } from '@/application/connection/type'
import jFetch from '@/functions/dom/jFetch'
import useFarms from './useFarm'
import { farms } from './farms'

const meteoraApiEndpoint = "https://amm.mercurial.finance/pools?address="

export default async function useFarmInfoLoader() {

  const result = await Promise.all(
    farms.map((f) => {
      const tvl = 0, volume = 0
      if (f.poolType === "meteora") {
        const result = getValue(f.lpAddress)
        return result
      }
      return { tvl, volume }
    })
  )

  const jsonInfos = farms.map((f, index) => {
    let tvl = parseFloat(result[index].tvl)
    if (f.id === 16) {
      tvl = 85
    }
    if (f.id === 18) {
      tvl = 1
    }
    if (f.id === 17) {
      tvl = 10
    }
    return {
      id: f.id,
      symbol: f.symbol,
      lpAddress: f.lpAddress,
      token0: f.token0,
      token1: f.token1,
      extUrl: f.extUrl,
      poolType: f.poolType,
      apy: f.apy,
      tvl: tvl,
      volume: parseFloat(result[index].volume)
    }
  })
  useFarms.setState({ jsonInfos: jsonInfos })
}

async function getValue(lpAddress: string) {
  const result = await jFetch<{
    result: {
      pool_tvl: number
      farming_apy: number
      trading_volume: number
    }
  }>(meteoraApiEndpoint + lpAddress)

  const tvl = result && result[0].pool_tvl
  const apr = result && result[0].farming_apy
  const volume = result && result[0].trading_volume

  return { tvl, volume }
}

/**
 * to calc apr use true onChain block slot count
 */
export async function getSlotCountForSecond(currentEndPoint: Endpoint | undefined) {
  if (!currentEndPoint) {
    useFarms.setState((s) => ({ blockSlotCount: s.blockSlotCount ?? 2 }))
    return
  }
  const result = await jFetch<{
    result: {
      numSlots: number
      numTransactions: number
      samplePeriodSecs: number
      slot: number
    }[]
  }>(currentEndPoint.url, {
    method: 'post',
    ignoreCache: true,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: 'getRecentPerformanceSamples',
      jsonrpc: '2.0',
      method: 'getRecentPerformanceSamples',
      params: [4]
    })
  })
  if (!result) {
    useFarms.setState((s) => ({ blockSlotCount: s.blockSlotCount ?? 2 }))
    return
  }

  const performanceList = result.result
  const slotList = performanceList.map((item) => item.numSlots)
  useFarms.setState({ blockSlotCount: slotList.reduce((a, b) => a + b, 0) / slotList.length / 60 })
  return
}
