import React, { useEffect, useCallback, useState, useMemo } from 'react'

import { DataView, Timer } from '@aragon/ui'
import { SubgraphOToken, OrderWithMetaData } from '../../../types'
import { useOrderbook } from '../../../contexts/orderbook'
import { getAskPrice, getBidPrice, getRemainingAmounts } from '../../../utils/0x-utils'
import { green, red } from './StyleDiv'
import { toTokenAmount } from '../../../utils/math'
import { generateNoOrderContent, NO_TOKEN_SELECTED } from '../../../constants/dataviewContents'
import { TradeAction, getUSDC } from '../../../constants'
import { simplifyOTokenSymbol } from '../../../utils/others'
import { useConnectedWallet } from '../../../contexts/wallet'

type OrderbookProps = {
  selectedOToken: SubgraphOToken | null
  action: TradeAction
}

export default function Orderbook({ selectedOToken, action }: OrderbookProps) {
  const [page, setPage] = useState(0)

  const { orderbooks } = useOrderbook()
  const { networkId } = useConnectedWallet()

  const [bids, setBids] = useState<OrderWithMetaData[]>([])
  const [asks, setAsks] = useState<OrderWithMetaData[]>([])

  useEffect(() => {
    const thisBook = selectedOToken ? orderbooks.find(book => book.id === selectedOToken.id) : undefined
    if (!thisBook) {
      setBids([])
      setAsks([])
    } else {
      setBids(thisBook.bids)
      setAsks(thisBook.asks)
    }
  }, [selectedOToken, orderbooks])

  const usdc = useMemo(() => getUSDC(networkId), [networkId])

  const renderRow = useCallback(
    (order: OrderWithMetaData) => {
      const isBid = usdc.id === order.order.makerToken

      const remainingAmounts = isBid
        ? toTokenAmount(order.metaData.remainingFillableTakerAmount, 8).toFixed(2)
        : toTokenAmount(getRemainingAmounts(order).remainingMakerAssetAmount, 8).toFixed(2)

      const price = isBid
        ? green(getBidPrice(order.order, 6, 8).toFixed(4))
        : red(getAskPrice(order.order, 8, 6).toFixed(4))

      return [price, remainingAmounts, <Timer format="ms" showIcon end={new Date(Number(order.order.expiry) * 1000)} />]
    },
    [usdc],
  )

  const allEntries = useMemo(() => {
    const copy = [...asks]
    const askReversed = copy.sort((a, b) => (getAskPrice(a.order).gt(getAskPrice(b.order)) ? -1 : 1))
    return askReversed.concat(bids)
  }, [bids, asks])

  return (
    <DataView
      emptyState={
        selectedOToken ? generateNoOrderContent(simplifyOTokenSymbol(selectedOToken?.symbol)) : NO_TOKEN_SELECTED
      }
      entriesPerPage={12}
      page={page}
      onPageChange={setPage}
      entries={allEntries}
      tableRowHeight={36}
      renderSelectionCount={x => `${x} Orders Selected`}
      fields={['price', 'amount', 'expiration']}
      renderEntry={renderRow}
    />
  )
}
