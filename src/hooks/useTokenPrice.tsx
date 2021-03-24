import { useEffect, useState } from 'react'
import BigNumber from 'bignumber.js'

import { ZERO_ADDR } from '../constants'

/**
 * get token price by address.
 * @param token token address
 * @param refetchIntervalSec refetch interval in seconds
 * @returns {BigNumber} price denominated in USD
 */
export const useTokenPrice = (token: string | undefined, refetchIntervalSec: number = 20): BigNumber => {
  const [price, setPrice] = useState(new BigNumber(0))

  useEffect(() => {
    let isCancelled = false

    async function updatePrice() {
      const price = await getTokenPriceCoingecko(token)
      if (!isCancelled) setPrice(price)
    }
    updatePrice()
    const id = setInterval(updatePrice, refetchIntervalSec * 1000)

    // cleanup function: remove interval
    return () => {
      isCancelled = true
      clearInterval(id)
    }
  }, [token, refetchIntervalSec])

  return price
}

export const getTokenPriceCoingecko = async (token: string | undefined): Promise<BigNumber> => {
  if (!token || token === ZERO_ADDR) return new BigNumber(0)
  let requestAddr = token
  // map kovan address to mainnet address
  // WETH
  if (
    requestAddr.toLowerCase() === '0xd0a1e359811322d97991e03f863a0c30c2cf029c' ||
    requestAddr.toLowerCase() === '0xc778417e063141139fce010982780140aa0cd5ab'
  )
    requestAddr = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
  // WBTC
  if (
    requestAddr.toLowerCase() === '0xd7c8c2f7b6ebdbc88e5ab0101dd24ed5aca58b0f' ||
    requestAddr.toLowerCase() === '0x6b8baf03cb00f8f1fa94999b71047fea06f7251a'
  )
    requestAddr = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'

  const url = `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${requestAddr}&vs_currencies=usd`
  const res = await fetch(url)
  const priceStruct: { usd: number } = (await res.json())[requestAddr.toLowerCase()]
  if (priceStruct === undefined) return new BigNumber(0)
  const price = priceStruct.usd
  return new BigNumber(price)
}
