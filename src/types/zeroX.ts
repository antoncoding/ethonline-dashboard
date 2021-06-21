// import { Signature } from '@0x/protocol-utils'

export type OrderWithMetaData = {
  order: SignedOrder
  metaData: {
    orderHash: string
    remainingFillableTakerAmount: string
  }
}

type Signature = {
  r: string
  s: string
  v: number
  signatureType: number
}

export type SignedOrder = UnsignedOrder & {
  signature: Signature
}

export type RfqOrder = {
  makerToken: string
  takerToken: string
  makerAmount: string
  takerAmount: string
  maker: string
  taker: string
  pool: string
  expiry: string
  salt: string
  chainId: number
  verifyingContract: string
  txOrigin: string
}

export type SignedRfqOrder = RfqOrder & {
  signature: Signature
}

export type IndicativeQuote = {
  makerAmount: string
  takerAmount: string
  makerToken: string
  takerToken: string
  expiry: string
}

export type UnsignedOrder = {
  makerToken: string
  takerToken: string
  makerAmount: string
  takerAmount: string
  maker: string
  taker: string
  pool: string
  expiry: string
  salt: string
  chainId: number
  verifyingContract: string
  takerTokenFeeAmount: string
  sender: string
  feeRecipient: string
}

export type OTokenOrderBook = {
  id: string
  asks: OrderWithMetaData[]
  bids: OrderWithMetaData[]
}

export type OTokenOrderBookWithDetail = OTokenOrderBook & {
  bestAskPrice: string
  bestBidPrice: string
  totalBidAmt: string
  totalAskAmt: string
}
