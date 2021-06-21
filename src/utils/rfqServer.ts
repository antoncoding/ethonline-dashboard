import BigNumber from 'bignumber.js'
import { rfqServer } from '../constants/endpoints'
import { SupportedNetworks } from '../constants/networks'
import { fromTokenAmount } from './math'

export async function getSellIndicativeQuoteByOtokenAmount(
  network: SupportedNetworks,
  otoken: string,
  quote: string,
  user: string,
  otokenAmount: BigNumber,
) {
  const host = rfqServer[network]
  const rawOtokenAmount = fromTokenAmount(otokenAmount, 8).toString()
  const url = `${host}/price?sellTokenAddress=${otoken}&buyTokenAddress=${quote}&takerAddress=${user}&protocolVersion=4&txOrigin=${user}&sellAmountBaseUnits=${rawOtokenAmount}`
  const result = await (await fetch(url)).json()
  return result
}

export async function getSellIndicativeQuoteByUSDCAmount(
  network: SupportedNetworks,
  otoken: string,
  quote: string,
  user: string,
  usdcAmount: BigNumber,
) {
  const host = rfqServer[network]
  const rawUSDCAmount = fromTokenAmount(usdcAmount, 6).toString()
  const url = `${host}/price?sellTokenAddress=${otoken}&buyTokenAddress=${quote}&takerAddress=${user}&protocolVersion=4&txOrigin=${user}&buyAmountBaseUnits=${rawUSDCAmount}`
  const result = await (await fetch(url)).json()
  return result
}
