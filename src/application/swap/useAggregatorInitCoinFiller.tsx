import { useEffect } from 'react'

import useToken from '@/application/token/useToken'
import { ECATMint } from '@/application/token/wellknownToken.config'
import { getURLQueryEntry } from '@/functions/dom/getURLQueryEntries'
import toPubString from '@/functions/format/toMintString'

import { QuantumSOLVersionSOL } from '../token/quantumSOL'

import { useAggregator } from './useAggregator'
import { getTokenSignature } from '../token/getTokenSignature'

export default function useAggregatorInitCoinFiller() {
  const tokens = useToken((s) => s.tokens)
  const getToken = useToken((s) => s.getToken)
  const coin1 = useAggregator((s) => s.coin1)
  const coin2 = useAggregator((s) => s.coin2)

  useEffect(() => {
    const query = getURLQueryEntry()
    const hasInputCurrency = Object.keys(query).includes('inputCurrency')
    const hasOutputCurrency = Object.keys(query).includes('outputCurrency')

    if (!coin1 && coin2?.mintString !== QuantumSOLVersionSOL.mintString && !hasInputCurrency) {
      useAggregator.setState({ coin1: QuantumSOLVersionSOL })
    }
    if (!coin2 && coin1?.mintString !== toPubString(ECATMint) && !hasOutputCurrency) {
      useAggregator.setState({ coin2: getToken(ECATMint) })
    }
  }, [tokens, getToken, coin1, coin2])

  // update token if needed
  useEffect(() => {
    const newCoin2Token = getToken(coin2?.mintString)
    if (coin2 && getTokenSignature(coin2) !== getTokenSignature(newCoin2Token)) {
      useAggregator.setState({ coin2: newCoin2Token })
    }
  }, [tokens, getToken])
}
