import { useState } from 'react'

import { useConnectedWallet } from '../contexts/wallet'
import { getLiveOTokens, getLiveOTokensIsSeries } from '../utils/graph'
import { useAsyncMemo } from '../hooks/useAsyncMemo'
import { useCustomToast } from './useCustomToast'

export function useLiveOTokens() {
  const { networkId } = useConnectedWallet()
  const toast = useCustomToast()

  const [isLoading, setIsLoading] = useState(true)

  const allOtokens = useAsyncMemo(
    async () => {
      try {
        const result = await getLiveOTokens(networkId, toast.error)
        setIsLoading(false)
        return result ? result : []
      } catch (error) {
        setIsLoading(false)
        return []
      }
    },
    [],
    [networkId, toast],
  )

  return { isLoading, allOtokens }
}

export function useOTokenInSeries(underlying: string | undefined, strike: string | undefined) {
  const { networkId } = useConnectedWallet()
  const toast = useCustomToast()

  const [isLoading, setIsLoading] = useState(true)

  const allOtokens = useAsyncMemo(
    async () => {
      try {
        const result =
          underlying && strike
            ? await getLiveOTokensIsSeries(networkId, underlying, strike, toast.error)
            : await getLiveOTokens(networkId, toast.error)
        setIsLoading(false)
        return result ? result : []
      } catch (error) {
        setIsLoading(false)
        return []
      }
    },
    [],
    [networkId, toast, underlying, strike],
  )

  return { isLoading, allOtokens }
}
