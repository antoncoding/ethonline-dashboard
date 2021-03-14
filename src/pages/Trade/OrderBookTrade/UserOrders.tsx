import React, { useMemo, useCallback, useState, useEffect } from 'react'
import { DataView, Timer, Button, LoadingRing } from '@aragon/ui'
import { SubgraphOToken, OrderWithMetaData } from '../../../types'
import { useOrderbook } from '../../../contexts/orderbook'
import { getAskPrice, getBidPrice, getRemainingAmounts } from '../../../utils/0x-utils'
import { green, red } from './StyleDiv'
import { toTokenAmount } from '../../../utils/math'
import { NO_TOKEN_SELECTED, generateNoUserOrderContent } from '../../../constants/dataviewContents'
import { simplifyOTokenSymbol } from '../../../utils/others'
import { useConnectedWallet } from '../../../contexts/wallet'
import { getPrimaryPaymentToken } from '../../../constants'
import { use0xExchange } from '../../../hooks/use0xExchange'
import { useCustomToast } from '../../../hooks'
import BigNumber from 'bignumber.js'

type OrderbookProps = {
  selectedOToken: SubgraphOToken | null
}

export default function UserOrders({ selectedOToken }: OrderbookProps) {
  const [page, setPage] = useState(0)
  const [selectedIdxs, setSelected] = useState<number[]>([])
  const [isCancelling, setIsCancelling] = useState(false)
  const { orderbooks } = useOrderbook()

  const { cancelOrders } = use0xExchange()

  const { user, networkId } = useConnectedWallet()

  const usd = useMemo(() => getPrimaryPaymentToken(networkId), [networkId])

  const [entries, setEntries] = useState<OrderWithMetaData[]>([])

  useEffect(() => {
    const thisBook = selectedOToken ? orderbooks.find(book => book.id === selectedOToken.id) : undefined
    if (!thisBook) setEntries([])
    else {
      const _entries = thisBook.bids.concat(thisBook.asks).filter((o: OrderWithMetaData) => o.order.maker === user)
      setEntries(_entries)
    }
  }, [selectedOToken, orderbooks, user])

  const renderRow = useCallback(
    (order: OrderWithMetaData) => {
      const isBid = order.order.makerToken === usd.id

      const remainingPercentage = new BigNumber(order.metaData.remainingFillableTakerAmount)
        .div(order.order.takerAmount)
        .toNumber()

      // 1 - new BigNumber(order.metaData.remainingFillableTakerAmount).div(order.order.takerAmount).toNumber()
      if (isBid) {
        const amonutLeft = toTokenAmount(order.metaData.remainingFillableTakerAmount, 8)
        const amountShown =
          remainingPercentage === 1
            ? amonutLeft.toFixed(2)
            : `${amonutLeft.toFixed(2)} (${remainingPercentage * 100} %)`
        // bid
        return [
          green(getBidPrice(order.order, usd.decimals, 8).toFixed(2)),
          amountShown,
          <Timer format="ms" showIcon end={new Date(Number(order.order.expiry) * 1000)} />,
        ]
      } else {
        const amonutLeft = toTokenAmount(getRemainingAmounts(order).remainingMakerAssetAmount, 8)
        const amountShown =
          remainingPercentage === 1
            ? amonutLeft.toFixed(2)
            : `${amonutLeft.toFixed(2)} (${remainingPercentage * 100} %)`
        return [
          red(getAskPrice(order.order, 8, usd.decimals).toFixed(2)),
          amountShown,
          <Timer format="ms" showIcon end={new Date(Number(order.order.expiry) * 1000)} />,
        ]
      }
    },
    [usd.id, usd.decimals],
  )

  const onSelectEntries = useCallback((entries, indexes) => {
    setSelected(indexes)
  }, [])

  const toast = useCustomToast()

  const cancel = useCallback(async () => {
    setIsCancelling(true)
    const orders = entries.filter((v, idx) => selectedIdxs.includes(idx)).map(o => o.order)
    try {
      await cancelOrders(orders, () => {
        setSelected([])
        setIsCancelling(false)
      })
    } catch (error) {
      setIsCancelling(false)
      toast.error(error.message)
    }
  }, [cancelOrders, toast, entries, selectedIdxs])

  return (
    <div style={{ paddingTop: '15px' }}>
      {
        <>
          <DataView
            emptyState={
              selectedOToken
                ? generateNoUserOrderContent(simplifyOTokenSymbol(selectedOToken?.symbol))
                : NO_TOKEN_SELECTED
            }
            entriesPerPage={6}
            page={page}
            onPageChange={setPage}
            entries={entries}
            tableRowHeight={40}
            onSelectEntries={onSelectEntries}
            selection={selectedIdxs}
            renderSelectionCount={x => `${x} Orders Selected`}
            fields={['My Orders', 'amount', 'expiration']}
            renderEntry={renderRow}
          />
          {selectedIdxs.length > 0 && (
            <Button
              wide
              disabled={isCancelling || selectedIdxs.length === 0}
              label={isCancelling ? <LoadingRing /> : 'Cancel'}
              mode="negative"
              onClick={cancel}
            />
          )}
        </>
      }
    </div>
  )
}
