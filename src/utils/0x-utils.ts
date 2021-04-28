import BigNumber from 'bignumber.js'
import {
  SignedOrder,
  OrderWithMetaData,
  SubgraphOToken as OToken,
  OTokenOrderBook,
  OTokenOrderBookWithDetail,
} from '../types'
import {
  ZeroXEndpoint,
  getPrimaryPaymentToken,
  OrderType,
  Errors,
  MIN_BID,
  MAX_ASK,
  ZERO_ADDR,
  SupportedNetworks,
} from '../constants'
import { sleep } from '../utils/others'
import { toTokenAmount } from './math'
const Promise = require('bluebird')

// const USING_PRIVATE_ENDPOINT = process.env.REACT_APP_ZX_ENDPOINT !== undefined;

type entries = {
  total: number
  page: number
  perPage: number
  records: OrderWithMetaData[]
}

/**
 * get oToken:WETH stats (v1) for all options
 * @param {Array<{addr:string, decimals:number}>} options
 * @param {{addr:string, decimals:number}} quoteAsset
 * @return {Promise<Array<
 * >}
 */
export async function getBasePairAskAndBids(
  oTokens: OToken[],
  networkId: SupportedNetworks,
): Promise<OTokenOrderBook[]> {
  const filteredOTokens = oTokens // await filter0xAvailablePairs(networkId, oTokens);
  // 0x has rate limit of 6 request / 10 sec, will need to chuck array into 6 each
  const BATCH_REQUEST = 6
  const COOLDOWN = networkId === 1 ? 0.5 : 2

  const batchOTokens = filteredOTokens.reduce(
    (prev: OToken[][], curr) => {
      if (prev.length > 0 && prev[prev.length - 1].length >= BATCH_REQUEST) {
        return [...prev, [curr]]
      } else {
        const copy = [...prev]
        copy[copy.length - 1].push(curr)
        return copy
      }
    },
    [[]],
  )

  let final: OTokenOrderBook[] = []

  for (const batch of batchOTokens) {
    const [bestAskAndBids] = await Promise.all([
      Promise.map(batch, async ({ id: oTokenAddr }: OToken) => {
        const { asks, bids } = await getOTokenUSDCOrderBook(networkId, oTokenAddr)
        return {
          id: oTokenAddr,
          asks: asks.filter(record => isValidAsk(record)),
          bids: bids.filter(record => isValidBid(record)),
        }
      }),
      sleep(COOLDOWN * 1000),
    ])
    final = final.concat(bestAskAndBids)
  }

  return final
}

export const getBidsSummary = (bids: OrderWithMetaData[]) => {
  let bestBidPrice = new BigNumber(0)
  let totalBidAmt = new BigNumber(0)
  if (bids.length === 0) return { bestBidPrice, totalBidAmt }

  const quoteDecimals = getPrimaryPaymentToken(bids[0].order.chainId).decimals
  console.log(`quoteDecimals`, quoteDecimals)
  bestBidPrice = getBidPrice(bids[0].order, quoteDecimals, 8)
  totalBidAmt = getTotalBidAmount(bids, 8)
  return {
    bestBidPrice,
    totalBidAmt,
  }
}

export const getAsksSummary = (asks: OrderWithMetaData[]) => {
  let bestAskPrice = new BigNumber(0)
  let totalAskAmt = new BigNumber(0)
  if (asks.length === 0) return { bestAskPrice, totalAskAmt }
  const quoteDecimals = getPrimaryPaymentToken(asks[0].order.chainId).decimals
  bestAskPrice = getAskPrice(asks[0].order, 8, quoteDecimals)
  totalAskAmt = getTotalAskAmount(asks, 8)
  return {
    bestAskPrice,
    totalAskAmt,
  }
}

export const getOrderBookDetail = (basicBook: OTokenOrderBook | undefined): OTokenOrderBookWithDetail => {
  if (basicBook === undefined) {
    return {
      id: '0',
      bids: [],
      asks: [],
      bestBidPrice: '0.0',
      bestAskPrice: '0.0',
      totalAskAmt: '0.0',
      totalBidAmt: '0.0',
    }
  }

  const bids = basicBook.bids.filter(order => isValidBid(order))
  const asks = basicBook.asks.filter(order => isValidAsk(order))

  const { bestBidPrice, totalBidAmt } = getBidsSummary(bids)
  const { bestAskPrice, totalAskAmt } = getAsksSummary(asks)

  return {
    id: basicBook.id,
    bids,
    asks,
    bestBidPrice: bestBidPrice.toFixed(2),
    bestAskPrice: bestAskPrice.toFixed(2),
    totalAskAmt: totalAskAmt.toFixed(2),
    totalBidAmt: totalBidAmt.toFixed(2),
  }
}

type PairData = {
  assetDataA: {
    minAmount: string
    maxAmount: string
    precision: number
    assetData: string
  }
  assetDataB: {
    minAmount: string
    maxAmount: string
    precision: number
    assetData: string
  }
}

/**
 *
 * @param {OrderWithMetaData} order
 */
export const getRemainingAmounts = (
  order: OrderWithMetaData,
): {
  remainingTakerAssetAmount: BigNumber
  remainingMakerAssetAmount: BigNumber
} => {
  const remainingTakerAssetAmount = new BigNumber(order.metaData.remainingFillableTakerAmount)
  const makerAssetAmountBN = new BigNumber(order.order.makerAmount)
  const takerAssetAmountBN = new BigNumber(order.order.takerAmount)
  const remainingMakerAssetAmount = remainingTakerAssetAmount.multipliedBy(makerAssetAmountBN).div(takerAssetAmountBN)
  return { remainingTakerAssetAmount, remainingMakerAssetAmount }
}

/**
 * get bids and asks for an oToken
 */
export async function getOTokenUSDCOrderBook(
  networkId: SupportedNetworks,
  oToken: string,
): Promise<{
  success: Boolean
  asks: OrderWithMetaData[]
  bids: OrderWithMetaData[]
}> {
  // skip request for kovan.
  if (networkId === SupportedNetworks.Kovan) {
    return {
      success: false,
      asks: [],
      bids: [],
    }
  }
  const quote = getPrimaryPaymentToken(networkId).id
  const endpoint = ZeroXEndpoint[networkId].http
  const url = `${endpoint}sra/v4/orderbook?baseToken=${oToken}&quoteToken=${quote}&perPage=${100}`
  try {
    const res = await fetch(url)
    // refetch in 0.5 sec
    if (res.status === 429) {
      await sleep(500)
      return getOTokenUSDCOrderBook(networkId, oToken)
    } else {
      const result: { asks: entries; bids: entries } = await res.json()
      return {
        success: true,
        asks: result.asks.records,
        bids: result.bids.records,
      }
    }
  } catch (error) {
    return {
      success: false,
      asks: [],
      bids: [],
    }
  }
}

export const isValidBid = (entry: OrderWithMetaData) => {
  const quoteDecimals = getPrimaryPaymentToken(entry.order.chainId).decimals
  const bidPrice = getBidPrice(entry.order, quoteDecimals, 8)
  return bidPrice.gt(MIN_BID) && isValid(entry)
}

export const isValidAsk = (entry: OrderWithMetaData) => {
  const quoteDecimals = getPrimaryPaymentToken(entry.order.chainId).decimals
  const askPrice = getAskPrice(entry.order, 8, quoteDecimals)
  console.log(`askPrice`, askPrice.toString())
  return askPrice.lt(MAX_ASK) && isValid(entry)
}

/**
 * Return true if the order is valid
 */
const isValid = (entry: OrderWithMetaData) => {
  const FILL_BUFFER = 35
  const open = entry.order.taker === ZERO_ADDR
  const notExpired = parseInt(entry.order.expiry, 10) > Date.now() / 1000 + FILL_BUFFER
  // const notDust = getOrderFillRatio(entry).gt(5) // got at least 5% unfill
  return notExpired && open
}

export const getOrderFillRatio = (order: OrderWithMetaData) =>
  new BigNumber(order.metaData.remainingFillableTakerAmount).div(new BigNumber(order.order.takerAmount)).times(100)

/**
 *
 * @param {number} networkId
 * @param {string[]} oTokens array of oToken addresses
 * @returns {OrderType}
 */
export const categorizeOrder = (
  networkId: SupportedNetworks,
  oTokens: string[],
  orderInfo: OrderWithMetaData,
): { type: OrderType; token: string } => {
  const usd = getPrimaryPaymentToken(networkId).id

  const takerToken = orderInfo.order.takerToken
  const makerToken = orderInfo.order.makerToken
  if (takerToken === usd && oTokens.includes(makerToken)) {
    return { type: OrderType.ASK, token: makerToken }
  }
  if (makerToken === usd && oTokens.includes(takerToken)) {
    return { type: OrderType.BID, token: takerToken }
  }
  return { type: OrderType.NOT_OTOKEN, token: '' }
}

/**
 * Send orders to the mesh node
 * @param {number} networkId
 * @param {SignedOrder[]} orders
 */
export const broadcastOrders = async (networkId: SupportedNetworks, orders: SignedOrder[]) => {
  const endpoint = ZeroXEndpoint[networkId].http
  const url = `${endpoint}sra/v4/orders`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orders),
  })
  if (res.status === 200) return
  const jsonRes = await res.json()
  throw jsonRes.validationErrors[0].reason
}

/**
 * Calculate the price of a bid order
 */
export const getBidPrice = (
  bid: SignedOrder,
  makerAssetDecimals: number = 6,
  takerAssetDecimals: number = 8,
): BigNumber => {
  const makerAssetAmount = toTokenAmount(new BigNumber(bid.makerAmount), makerAssetDecimals)
  const takerAssetAmount = toTokenAmount(new BigNumber(bid.takerAmount), takerAssetDecimals)
  return makerAssetAmount.div(takerAssetAmount)
}

/**
 * Sort functino to sort bids from high to low
 * @param a
 * @param b
 */
export const sortBids = (a: OrderWithMetaData, b: OrderWithMetaData): 1 | -1 => {
  // sorting funciton, doensn't matter what decimals we pass in
  const priceA = getBidPrice(a.order)
  const priceB = getBidPrice(b.order)
  return priceA.gt(priceB) ? -1 : 1
}

/**
 * Sort function to sort asks from low to high
 * @param a
 * @param b
 */
export const sortAsks = (a: OrderWithMetaData, b: OrderWithMetaData): 1 | -1 => {
  // sorting funciton, doensn't matter what decimals we pass in
  const priceA = getAskPrice(a.order)
  const priceB = getAskPrice(b.order)
  return priceA.gt(priceB) ? 1 : -1
}

/**
 * Calculate price of an ask order
 * @description maker want to sell oToken
 * takerAssetAmount 100 weth
 * makerAssetAmount 1 oToken
 */
export const getAskPrice = (
  ask: SignedOrder,
  makerAssetDecimals: number = 8,
  takerAssetDecimals: number = 6,
): BigNumber => {
  const makerAssetAmount = toTokenAmount(new BigNumber(ask.makerAmount), makerAssetDecimals)
  console.log(`makerAssetAmount`, makerAssetAmount.toString())
  const takerAssetAmount = toTokenAmount(new BigNumber(ask.takerAmount), takerAssetDecimals)
  console.log(`takerAssetAmount`, takerAssetAmount.toString())
  return takerAssetAmount.div(makerAssetAmount)
}

/**
 *
 * @param asks
 * @param decimals
 * @returns {BigNumber} max amount of oToken fillable
 */
export const getTotalAskAmount = (asks: OrderWithMetaData[], decimals: number): BigNumber => {
  return asks.reduce(
    (prev, cur) => prev.plus(toTokenAmount(getRemainingAmounts(cur).remainingMakerAssetAmount, decimals)),
    new BigNumber(0),
  )
}

/**
 *
 * @param bids
 * @param decimals
 * @returns {BigNumber} max amount of oToken fillable
 */
export const getTotalBidAmount = (bids: OrderWithMetaData[], decimals: number): BigNumber => {
  return bids.reduce(
    (prev, cur) => prev.plus(toTokenAmount(cur.metaData.remainingFillableTakerAmount, decimals)),
    new BigNumber(0),
  )
}

/**
 * Calculate amount of output token to get if I supply {amount} takerAsset
 * @param orderInfos bid order
 * @param amount oToken to sell
 */
export const calculateOrderOutput = (orderInfos: OrderWithMetaData[], amount: BigNumber) => {
  if (amount.isZero()) {
    return {
      error: Errors.NO_ERROR,
      ordersToFill: [] as SignedOrder[],
      amounts: [] as BigNumber[],
      sumOutput: new BigNumber(0),
    }
  }
  if (orderInfos.length === 0) {
    return {
      error: Errors.INSUFFICIENT_LIQUIDITY,
      ordersToFill: [] as SignedOrder[],
      amounts: [] as BigNumber[],
      sumOutput: new BigNumber(0),
    }
  }
  let inputLeft = amount.integerValue()

  let sumOutput = new BigNumber(0)

  // array of orders to fill
  const ordersToFill: SignedOrder[] = []
  // amounts to fill for each order
  const amounts: BigNumber[] = []

  for (const { metaData, order } of orderInfos) {
    // amonunt of oToken fillable. always an integer
    const fillable = new BigNumber(metaData.remainingFillableTakerAmount)

    ordersToFill.push(order)

    const price = new BigNumber(order.makerAmount).div(new BigNumber(order.takerAmount))

    if (fillable.lt(inputLeft)) {
      sumOutput = sumOutput.plus(fillable.times(price).integerValue(BigNumber.ROUND_DOWN))
      inputLeft = inputLeft.minus(fillable)
      // fill the full amount of this order
      amounts.push(fillable)
    } else {
      sumOutput = sumOutput.plus(inputLeft.times(price).integerValue(BigNumber.ROUND_DOWN))
      // fill the last order with only amount = inputLeft
      amounts.push(inputLeft)
      inputLeft = new BigNumber(0)
      break
    }
  }

  if (inputLeft.gt(new BigNumber(0))) {
    return {
      error: Errors.INSUFFICIENT_LIQUIDITY,
      ordersToFill: [] as SignedOrder[],
      amounts: [] as BigNumber[],
      sumOutput: new BigNumber(0),
    }
  }

  return { error: Errors.NO_ERROR, ordersToFill, amounts, sumOutput: sumOutput.integerValue() }
}

/**
 * Calculate amount of {takerAsset} need to pay if I want {amount} {makerAsset}
 * @param orderInfos ask orders
 * @param amount oToken I want to buy
 */
export const calculateOrderInput = (orderInfos: OrderWithMetaData[], amount: BigNumber) => {
  if (amount.isZero()) {
    return {
      error: Errors.NO_ERROR,
      ordersToFill: [] as SignedOrder[],
      amounts: [] as BigNumber[],
      sumInput: new BigNumber(0),
    }
  }
  if (orderInfos.length === 0) {
    return {
      error: Errors.INSUFFICIENT_LIQUIDITY,
      ordersToFill: [] as SignedOrder[],
      amounts: [] as BigNumber[],
      sumInput: new BigNumber(0),
    }
  }
  let neededMakerAmount = amount // needed maker asset

  const ordersToFill: SignedOrder[] = []
  // amounts to fill for each order (rounded)
  const amounts: BigNumber[] = []

  for (const { metaData, order } of orderInfos) {
    const fillableTakerAmount = new BigNumber(metaData.remainingFillableTakerAmount)

    const fillableMakerAmount = new BigNumber(order.makerAmount)
      .times(fillableTakerAmount)
      .div(new BigNumber(order.takerAmount))
      .integerValue(BigNumber.ROUND_DOWN)

    ordersToFill.push(order)

    if (fillableMakerAmount.lt(neededMakerAmount)) {
      // takes all fillabe amount
      amounts.push(fillableTakerAmount)
      neededMakerAmount = neededMakerAmount.minus(fillableMakerAmount)
    } else {
      // only fill partial of the order
      const requiredTakerAsset = fillableTakerAmount.times(neededMakerAmount).div(fillableMakerAmount)
      amounts.push(requiredTakerAsset.integerValue(BigNumber.ROUND_CEIL))
      neededMakerAmount = new BigNumber(0)
      break
    }
  }

  if (neededMakerAmount.gt(new BigNumber(0))) {
    return {
      error: Errors.INSUFFICIENT_LIQUIDITY,
      ordersToFill: [] as SignedOrder[],
      amounts: [] as BigNumber[],
      sumInput: new BigNumber(0),
    }
  }

  // sum all amounts
  const sumInput = amounts.reduce((prev, curr) => prev.plus(curr), new BigNumber(0))

  return {
    error: Errors.NO_ERROR,
    ordersToFill,
    amounts,
    sumInput: sumInput.integerValue(),
  }
}
