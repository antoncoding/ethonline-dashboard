export type OrderWithMetaData = {
  order: SignedOrder
  metaData: {
    orderHash: string
    remainingFillableTakerAssetAmount: string
  }
}

export type SignedOrder = UnsignedOrder & {
  signature: {
    r: string
    s: string
    v: number
    signatureType: number
  }
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
