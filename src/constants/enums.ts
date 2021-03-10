export enum OrderType {
  NOT_OTOKEN,
  BID,
  ASK,
}

export enum DeadlineUnit {
  Seconds = 'seconds',
  Minutes = 'minutes',
  Hours = 'hours',
  Days = 'days',
}

export enum TradeAction {
  Buy = 'buy',
  Sell = 'sell',
}

export enum MarketTypes {
  Market = 'market',
  Limit = 'limit',
}

export enum Errors {
  NO_ERROR = 'no error',
  INSUFFICIENT_LIQUIDITY = 'Insufficient Liquidity',
  INSUFFICIENT_BALANCE = 'Insufficient Balance',
}

export enum Spenders {
  MarginPool,
  ZeroXExchange,
}
