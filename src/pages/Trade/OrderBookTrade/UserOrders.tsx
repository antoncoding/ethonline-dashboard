import React, { useMemo, useCallback, useState, useEffect } from 'react'
import { assetDataUtils } from '@0x/order-utils'
import { DataView, Timer, Button, LoadingRing } from '@aragon/ui'
import { SubgraphOToken, OrderWithMetaData } from '../../../types'
import { useOrderbook } from '../../../contexts/orderbook'
import { getAskPrice, getBidPrice, getRemainingAmounts } from '../../../utils/0x-utils'
import { green, red } from './StyleDiv'
import { toTokenAmount } from '../../../utils/math'
import { NO_TOKEN_SELECTED, generateNoUserOrderContent } from '../../../constants/dataviewContents'
import { simplifyOTokenSymbol } from '../../../utils/others'
import { useConnectedWallet } from '../../../contexts/wallet'
import { getUSDC } from '../../../constants'
import { use0xExchange } from '../../../hooks/use0xExchange'
import { useCustomToast } from '../../../hooks'

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

  const usdc = useMemo(() => getUSDC(networkId), [networkId])

  const [entries, setEntries] = useState<OrderWithMetaData[]>([])

  useEffect(() => {
    const thisBook = selectedOToken ? orderbooks.find(book => book.id === selectedOToken.id) : undefined
    if (!thisBook) setEntries([])
    else {
      const _entries = thisBook.bids
        .concat(thisBook.asks)
        .filter((o: OrderWithMetaData) => o.order.makerAddress === user)
      setEntries(_entries)
    }
  }, [selectedOToken, orderbooks, user])

  const renderRow = useCallback(
    (order: OrderWithMetaData) => {
      const usdcAssetData = assetDataUtils.encodeERC20AssetData(usdc.id)
      if (order.order.makerAssetData === usdcAssetData) {
        // bid
        return [
          green(getBidPrice(order.order, 6, 8).toFixed(4)),
          toTokenAmount(order.metaData.remainingFillableTakerAssetAmount, 8).toFixed(2),
          <Timer format="ms" showIcon end={new Date(Number(order.order.expirationTimeSeconds) * 1000)} />,
        ]
      } else {
        return [
          red(getAskPrice(order.order, 8, 6).toFixed(4)),
          toTokenAmount(getRemainingAmounts(order).remainingMakerAssetAmount, 8).toFixed(2),
          <Timer format="ms" showIcon end={new Date(Number(order.order.expirationTimeSeconds) * 1000)} />,
        ]
      }
    },
    [usdc.id],
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
