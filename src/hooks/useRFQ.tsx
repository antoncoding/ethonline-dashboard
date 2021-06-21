import { useState, useCallback } from 'react'
import { IndicativeQuote, SignedRfqOrder, Token } from '../types'
import { TradeAction } from '../constants/enums'
import { rfqServer } from '../constants/endpoints'
import { useConnectedWallet } from '../contexts/wallet'
import { SupportedNetworks } from '../constants'

export function useRFQ(makerToken: Token, takerToken: Token, action: TradeAction) {
  const [isRequestingIndicative, setIsRequestingIndicative] = useState(false)
  const [isRequestingFirm, setIsRequestingFirm] = useState(false)

  const [indicativeQuote, setIndicativeQuote] = useState<null | IndicativeQuote>(null)
  const [rfqOrder, setRFQOrder] = useState<null | SignedRfqOrder>(null)

  const { user, networkId } = useConnectedWallet()

  /**
   * Request Indicative quote, store value in [indicativeQuote]
   */
  const requestIndicativeQuote = useCallback(
    async (makerTokenAmount?: string, takerTokenAmount?: string) => {
      setIsRequestingIndicative(true)
      try {
        const quote = await getIndicativeQuote(
          makerToken.id,
          takerToken.id,
          networkId,
          user,
          makerTokenAmount,
          takerTokenAmount,
        )
        setIndicativeQuote(quote)
      } finally {
        setIsRequestingIndicative(false)
      }
    },
    [networkId, user, makerToken, takerToken],
  )

  /**
   * Request a firm quote, store value in [rfqOrder]
   */
  const requestFirmQuote = useCallback(
    async (makerTokenAmount?: string, takerTokenAmount?: string) => {
      setIsRequestingFirm(true)
      try {
        const quote = await getFirmQuote(
          makerToken.id,
          takerToken.id,
          networkId,
          user,
          makerTokenAmount,
          takerTokenAmount,
        )
        setRFQOrder(quote)
      } finally {
        setIsRequestingFirm(false)
      }
    },
    [networkId, user, makerToken, takerToken],
  )

  return {
    rfqOrder,
    requestIndicativeQuote,
    requestFirmQuote,
    indicativeQuote,
    isRequestingIndicative,
    isRequestingFirm,
  }
}

async function getIndicativeQuote(
  makerToken: string,
  takerToken: string,
  networkId: SupportedNetworks,
  taker: string,
  makerTokenAmount?: string,
  takerTokenAmount?: string,
) {
  const host = rfqServer[networkId]
  let url = `${host}price?sellTokenAddress=${takerToken}&buyTokenAddress=${makerToken}&takerAddress=${taker}&protocolVersion=4&txOrigin=${taker}`
  if (makerTokenAmount) {
    url = url.concat(`&buyAmountBaseUnits=${makerTokenAmount}`)
  } else {
    url = url.concat(`&sellAmountBaseUnits=${takerTokenAmount}`)
  }
  const headers = { '0x-api-key': 'key' }
  const quote = await (await fetch(url, { headers })).json()
  return quote
}

async function getFirmQuote(
  makerToken: string,
  takerToken: string,
  networkId: SupportedNetworks,
  taker: string,
  makerTokenAmount?: string,
  takerTokenAmount?: string,
) {
  const host = rfqServer[networkId]
  let url = `${host}quote?sellTokenAddress=${takerToken}&buyTokenAddress=${makerToken}&takerAddress=${taker}&protocolVersion=4&txOrigin=${taker}`
  if (makerTokenAmount) {
    url = url.concat(`&buyAmountBaseUnits=${makerTokenAmount}`)
  } else {
    url = url.concat(`&sellAmountBaseUnits=${takerTokenAmount}`)
  }
  const headers = { '0x-api-key': 'key' }
  const quote = await (await fetch(url, { headers })).json()
  return quote.signedOrder
}
