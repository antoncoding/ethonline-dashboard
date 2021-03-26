import { useState, useMemo } from 'react'

import { getAccount } from '../utils/graph'
import useAsyncMemo from './useAsyncMemo'
import { useCustomToast } from './useCustomToast'
import { useConnectedWallet } from '../contexts/wallet'
import { isEOA } from '../utils/others'
import { getPayableProxyAddr } from '../constants'

export function useAuthorizedOperators(account: string) {
  const toast = useCustomToast()
  const { networkId } = useConnectedWallet()

  const [isLoading, setIsLoading] = useState(true)

  // fetch account data, check if each operator is EOA
  const operators = useAsyncMemo(
    async () => {
      if (!account) return []
      const accountData = await getAccount(networkId, account, toast.error)
      const operatorsRelations = accountData ? accountData.operators : []
      const operatorsWithExtraInfo = await Promise.all(
        operatorsRelations.map(async relation => {
          const isEOAAddress = await isEOA(relation.operator.id, networkId)
          return {
            address: relation.operator.id,
            isEOA: isEOAAddress,
          }
        }),
      )
      setIsLoading(false)
      return operatorsWithExtraInfo
    },
    [],
    [networkId, account],
  )

  const hasAuthorizedPayalbeProxy = useMemo(() => {
    const payableProxy = getPayableProxyAddr(networkId)
    if (!payableProxy) return false
    return operators.find(o => o.address === payableProxy.address) !== undefined
  }, [networkId, operators])

  return { operators, isLoading, hasAuthorizedPayalbeProxy }
}
