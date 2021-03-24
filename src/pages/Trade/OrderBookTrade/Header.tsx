import React, { useState, useMemo, useEffect } from 'react'
import BigNumber from 'bignumber.js'
import { Header, DropDown, LoadingRing } from '@aragon/ui'

import { useOTokenInSeries } from '../../../hooks/useOTokens'
import { useAllSeries } from '../../../hooks/useAllProducts'
import { toUTCDateString } from '../../../utils/others'
import { Token } from '../../../types'

type HeaderProps = {
  setOTokens: any
  spotPrice: BigNumber
  underlying: Token
  setSelectedUnderlying: React.Dispatch<React.SetStateAction<Token>>
}

export default function TradeHeadBar({ underlying, spotPrice, setOTokens, setSelectedUnderlying }: HeaderProps) {
  const [seriesId, setSeiresId] = useState(0)
  const [expiryId, setExpiryId] = useState(0)

  const { allSeries } = useAllSeries()

  const series = useMemo(() => (allSeries.length === 0 ? null : allSeries[seriesId]), [allSeries, seriesId])

  console.log(`series`, series)

  useEffect(() => {
    if (series !== null) setSelectedUnderlying({ ...series.underlying, id: series.underlying.id })
  }, [series, setSelectedUnderlying])

  const { allOtokens: allOToken } = useOTokenInSeries(series?.underlying.id, series?.strike.id)

  const uniqueExpiries = useMemo(() => {
    return allOToken
      .filter(o => o.underlyingAsset.id === series?.underlying.id)
      .reduce((prev: string[], curr) => {
        if (!prev.includes(curr.expiryTimestamp)) return [...prev, curr.expiryTimestamp]
        return prev
      }, [])
      .sort((a, b) => (Number(a) > Number(b) ? 1 : -1))
  }, [allOToken, series])

  const expiry = useMemo(() => (uniqueExpiries.length === 0 ? null : uniqueExpiries[expiryId]), [
    uniqueExpiries,
    expiryId,
  ])

  const oTokens = useMemo(
    () =>
      allOToken
        .filter(o => o.underlyingAsset.id === series?.underlying.id && o.strikeAsset.id === series?.strike.id)
        .filter(o => o.expiryTimestamp === expiry),
    [allOToken, expiry, series],
  )

  useEffect(() => {
    setOTokens(oTokens)
  }, [oTokens, setOTokens])

  return (
    <>
      <Header
        primary={`Trade ${underlying.symbol} Options ($${spotPrice.toFixed(2)})`}
        secondary={
          <div style={{ display: 'flex' }}>
            <DropDown
              placeholder={allSeries.length === 0 ? <LoadingRing /> : 'Select series'}
              items={allSeries.map(s => `${s.underlying.symbol}-${s.strike.symbol}`)}
              disabled={allSeries.length === 0}
              selected={seriesId}
              onChange={setSeiresId}
            />
            <div style={{ padding: '10px' }}></div>
            <DropDown
              placeholder={uniqueExpiries.length === 0 ? <LoadingRing /> : 'Select Expiry'}
              items={uniqueExpiries.map(e => toUTCDateString(Number(e)))}
              disabled={uniqueExpiries.length === 0}
              selected={expiryId}
              onChange={setExpiryId}
            />
          </div>
        }
      />
    </>
  )
}
