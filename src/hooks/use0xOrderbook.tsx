import { useEffect, useState, useMemo, useReducer } from 'react'
import useWebSocket, { ReadyState } from 'react-use-websocket'
import { ZeroXEndpoint, OrderType, getUSDC } from '../constants'
import { useConnectedWallet } from '../contexts/wallet'
import { OrderWithMetaData, SubgraphOToken, OTokenOrderBook } from '../types'
import { categorizeOrder, getBasePairAskAndBids, sortBids, sortAsks, isValidBid, isValidAsk } from '../utils/0x-utils'
// import { assetDataUtils } from '@0x/order-utils'

enum OrderbookUpdateType {
  Init,
  Update,
  Expire,
}

function orderbookReducer(
  books: OTokenOrderBook[],
  action: {
    type?: OrderbookUpdateType
    updateInfos?: {
      type: OrderType
      token: string
      order: OrderWithMetaData
    }[]
    books?: OTokenOrderBook[]
  },
) {
  switch (action.type) {
    case OrderbookUpdateType.Init: {
      return action.books ?? []
    }
    case OrderbookUpdateType.Update: {
      if (!action.updateInfos) return books
      let orderbooksCopy = [...books]
      for (const { type, token, order: orderInfo } of action.updateInfos) {
        if (type === OrderType.BID) {
          const orderBookForThisOToken = orderbooksCopy.find(ob => ob.id === token)
          if (orderBookForThisOToken) {
            const bids = orderBookForThisOToken.bids
            const existingBidIdx = bids.findIndex(bid => bid.metaData.orderHash === orderInfo.metaData.orderHash)
            if (existingBidIdx !== -1) {
              orderBookForThisOToken.bids[existingBidIdx] = orderInfo
            } else {
              orderBookForThisOToken.bids.push(orderInfo)
              orderBookForThisOToken.bids = orderBookForThisOToken.bids.sort(sortBids)
            }
            orderBookForThisOToken.bids = orderBookForThisOToken.bids.filter(isValidBid)
          } else {
            // no orderbook for this oToken
            if (orderInfo.metaData.remainingFillableTakerAmount !== '0') {
              const bids = [orderInfo]
              orderbooksCopy.push({ bids, asks: [], id: token })
            }
          }
        } else if (type === OrderType.ASK) {
          const orderBookForThisOToken = orderbooksCopy.find(ob => ob.id === token)
          if (orderBookForThisOToken) {
            const asks = orderBookForThisOToken.asks
            const existingAskIdx = asks.findIndex(ask => ask.metaData.orderHash === orderInfo.metaData.orderHash)
            if (existingAskIdx !== -1) {
              orderBookForThisOToken.asks[existingAskIdx] = orderInfo
            } else {
              orderBookForThisOToken.asks.push(orderInfo)
              orderBookForThisOToken.asks = orderBookForThisOToken.asks.sort(sortAsks)
            }
            orderBookForThisOToken.asks = orderBookForThisOToken.asks.filter(isValidAsk)
          } else {
            // no orderbook for this oToken
            if (orderInfo.metaData.remainingFillableTakerAmount !== '0') {
              const asks = [orderInfo]
              orderbooksCopy.push({ asks, bids: [], id: token })
            }
          }
        }
      }
      return orderbooksCopy
    }
    case OrderbookUpdateType.Expire: {
      const orderbooksCopy = [...books]
      for (let orderbook of orderbooksCopy) {
        orderbook.bids = orderbook.bids.filter(order => isValidBid(order))
        orderbook.asks = orderbook.asks.filter(order => isValidAsk(order))
      }
      return orderbooksCopy
    }
    default:
      return books
  }
}

export function use0xOrderBooks(oTokens: SubgraphOToken[], completeCallback?: any) {
  const { networkId } = useConnectedWallet()

  const wsUrl = useMemo(() => ZeroXEndpoint[networkId].ws, [networkId])

  const [isLoading, setIsLoading] = useState(true)

  const [orderbooksBasic, dispatch] = useReducer(orderbookReducer, [])

  const { sendMessage, lastMessage, readyState } = useWebSocket(
    wsUrl,
    {
      share: true,
      onError: event => {
        console.log(event)
      },
      shouldReconnect: closeEvent => true,
      reconnectAttempts: 10,
      reconnectInterval: 3000,
    },
    true,
  )

  // fetch initial bids and asks when oTokens are ready
  useEffect(() => {
    async function refreshOrders() {
      if (oTokens.length === 0) return []
      setIsLoading(true)
      const result = await getBasePairAskAndBids(oTokens, networkId)
      setIsLoading(false)
      if (typeof completeCallback === 'function') completeCallback()
      return result
    }
    refreshOrders().then((books: OTokenOrderBook[]) => {
      dispatch({ type: OrderbookUpdateType.Init, books })
    })
  }, [oTokens, networkId, completeCallback])

  useEffect(() => {
    // subscribe to order changes
    if (readyState === ReadyState.OPEN) return

    const usdc = getUSDC(networkId).id
    const config: any = {
      type: 'subscribe',
      channel: 'orders',
      requestId: Date.now().toString(),
      traderToken: usdc,
    }
    sendMessage(JSON.stringify(config))
  }, [readyState, sendMessage, networkId])

  // filter out invalid orders every 5 sec
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: OrderbookUpdateType.Expire })
    }, 5000)
    return () => clearInterval(interval)
  }, [orderbooksBasic])

  const [lastUpdatedMsg, setLastUpdatedMsg] = useState<any>(null)

  // update bids and asks array when receive new orders
  useEffect(() => {
    if (!lastMessage || !lastMessage.data) return
    if (lastMessage === lastUpdatedMsg) return

    // const orderbooksCopy = [...orderbooksBasic]

    const data = JSON.parse(lastMessage.data)
    const orders: OrderWithMetaData[] = data.payload
    const otokenAddrs = oTokens.map(token => token.id)

    const updateInfos = orders
      .map(orderInfo => {
        const { type, token } = categorizeOrder(networkId, otokenAddrs, orderInfo)
        return { type, token, order: orderInfo }
      })
      .filter(updateInfo => {
        return updateInfo.type !== OrderType.NOT_OTOKEN
      })

    if (updateInfos.length > 0)
      dispatch({
        type: OrderbookUpdateType.Update,
        updateInfos,
      })

    setLastUpdatedMsg(lastMessage)
  }, [lastUpdatedMsg, lastMessage, orderbooksBasic, oTokens, networkId])

  return { orderbooks: orderbooksBasic, isLoading }
}
