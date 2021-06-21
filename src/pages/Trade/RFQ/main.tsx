import React, { useMemo, useState, useCallback, useEffect } from 'react'
import { Row, Col } from 'react-grid-system'
import BigNumber from 'bignumber.js'
import { Button, TextInput, IconArrowRight, IconUnlock, Timer, LoadingRing } from '@aragon/ui'

import { SubgraphOToken, OTokenBalance, IndicativeQuote } from '../../../types'
import { toTokenAmount, fromTokenAmount } from '../../../utils/math'
import { TradeAction, Errors, Spenders } from '../../../constants'
import { useConnectedWallet } from '../../../contexts/wallet'
import { getPrimaryPaymentToken } from '../../../constants/addresses'
import OTokenIcon from '../../../components/OTokenIcon'
import USDCImgUrl from '../../../imgs/USDC.png'
import { use0xExchange } from '../../../hooks/use0xExchange'
import { useRFQ } from '../../../hooks/useRFQ'
import { useUserAllowance } from '../../../hooks/useAllowance'
import { simplifyOTokenSymbol } from '../../../utils/others'
import WarningText from '../../../components/Warning'
import LabelText from '../../../components/LabelText'
import TokenBalanceEntry from '../../../components/TokenBalanceEntry'
import SectionTitle from '../../../components/SectionHeader'
import CustomIdentityBadge from '../../../components/CustomIdentityBadge'
import { useTokenPrice } from '../../../hooks'

const iv = require('implied-volatility')

enum Updates {
  Input,
  Output,
}

type MarketTicketProps = {
  action: TradeAction
  selectedOToken: SubgraphOToken
  oTokenBalances: OTokenBalance[] | null
  usdBalance: BigNumber
}

export default function RFQMain({ action, selectedOToken, oTokenBalances, usdBalance }: MarketTicketProps) {
  const [takerTokenAmount, setInputTokenAmount] = useState(new BigNumber(1))
  const [makerTokenAmount, setOutputTokenAmount] = useState(new BigNumber(0))

  const { networkId } = useConnectedWallet()

  const paymentToken = useMemo(() => getPrimaryPaymentToken(networkId), [networkId])

  const [isFinalized, setIsFinalized] = useState(false)
  const [isFilling, setIsFilling] = useState(false)

  const { fillRFQOrder } = use0xExchange()

  // what was the last amount user adjust
  const [lastUpdate, setLastUpdate] = useState<Updates>(Updates.Input)

  const [error, setError] = useState(Errors.NO_ERROR)

  const spotPrice = useTokenPrice(selectedOToken.underlyingAsset.id, 10)

  const oTokenBalance = useMemo(
    () => oTokenBalances?.find(b => b.token.id === selectedOToken.id)?.balance ?? new BigNumber(0),
    [oTokenBalances, selectedOToken],
  )

  const takerToken = useMemo(() => (action === TradeAction.Buy ? paymentToken : selectedOToken), [
    paymentToken,
    selectedOToken,
    action,
  ])

  const makerToken = useMemo(() => (action === TradeAction.Buy ? selectedOToken : paymentToken), [
    paymentToken,
    selectedOToken,
    action,
  ])

  const [needApprove, setNeedApprove] = useState(true)
  const [isApproving, setIsApproving] = useState(false)

  const { allowance: usdcAllowance, approve: approveUSDC } = useUserAllowance(paymentToken.id, Spenders.ZeroXExchange)
  const { allowance: oTokenAllowance, approve: approveOToken } = useUserAllowance(
    selectedOToken.id,
    Spenders.ZeroXExchange,
  )

  const approve = useCallback(async () => {
    setIsApproving(true)
    const rawTakerAmount = fromTokenAmount(takerTokenAmount, takerToken.decimals)
    if (action === TradeAction.Buy) await approveUSDC(rawTakerAmount)
    else await approveOToken(rawTakerAmount)
    setIsApproving(false)
  }, [takerTokenAmount, takerToken, action, approveUSDC, approveOToken])

  const inputIcon = useMemo(
    () =>
      action === TradeAction.Buy ? (
        <img alt="inputtoken" width={25} src={USDCImgUrl} />
      ) : (
        <OTokenIcon otoken={selectedOToken} width={25} />
      ),
    [action, selectedOToken],
  )

  const outputIcon = useMemo(
    () =>
      action === TradeAction.Buy ? (
        <OTokenIcon otoken={selectedOToken} width={25} />
      ) : (
        <img alt="outputtoken" width={25} src={USDCImgUrl} />
      ),
    [action, selectedOToken],
  )

  const {
    rfqOrder,
    indicativeQuote,
    isRequestingFirm,
    isRequestingIndicative,
    requestFirmQuote,
    requestIndicativeQuote,
  } = useRFQ(
    action === TradeAction.Buy ? selectedOToken : paymentToken,
    action === TradeAction.Buy ? paymentToken : selectedOToken,
    action,
  )

  const handleInputChange = useCallback(
    event => {
      try {
        const newAmount = new BigNumber(event.target.value)
        setInputTokenAmount(newAmount)
        setLastUpdate(Updates.Input)
      } catch {}
    },
    [setInputTokenAmount],
  )

  const handleOuputChange = useCallback(
    event => {
      try {
        const newAmount = new BigNumber(event.target.value)
        setOutputTokenAmount(newAmount)
        setLastUpdate(Updates.Output)
      } catch {}
    },
    [setOutputTokenAmount],
  )

  const price = useMemo(() => {
    if (action === TradeAction.Sell) {
      return takerTokenAmount.isZero() || takerTokenAmount.isNaN()
        ? new BigNumber(0)
        : makerTokenAmount.div(takerTokenAmount)
    } else {
      return makerTokenAmount.isZero() || makerTokenAmount.isNaN()
        ? new BigNumber(0)
        : takerTokenAmount.div(makerTokenAmount)
    }
  }, [takerTokenAmount, action, makerTokenAmount])

  const impliedV = useMemo(() => {
    const t = new BigNumber(Number(selectedOToken.expiryTimestamp) - Date.now() / 1000).div(86400).div(365).toNumber()
    const s = spotPrice.toNumber()
    const initEstimation = 1
    const interestRate = 0.05

    const k = parseInt(selectedOToken.strikePrice) / 1e8
    const type = selectedOToken.isPut ? 'put' : 'call'
    return iv.getImpliedVolatility(price.toNumber(), s, k, t, interestRate, type, initEstimation)
  }, [price, spotPrice, selectedOToken])

  // refetch indicative quote upon input change
  useEffect(() => {
    if (lastUpdate !== Updates.Input) return
    // fix input, recalculate output
    const rawTakerAmount = fromTokenAmount(takerTokenAmount, takerToken.decimals).integerValue().toString()
    requestIndicativeQuote(undefined, rawTakerAmount)
  }, [takerTokenAmount, takerToken, requestIndicativeQuote, lastUpdate])

  useEffect(() => {
    if (lastUpdate !== Updates.Output) return
    // fix output, update input
    const rawMakerAmount = fromTokenAmount(makerTokenAmount, makerToken.decimals).integerValue().toString()
    requestIndicativeQuote(rawMakerAmount, undefined)
  }, [makerToken, requestIndicativeQuote, lastUpdate, makerTokenAmount])

  useEffect(() => {
    if (error !== Errors.NO_ERROR && error !== Errors.INSUFFICIENT_BALANCE) return
    const inputBalance = action === TradeAction.Buy ? usdBalance : oTokenBalance
    const rawTakerAmount = fromTokenAmount(takerTokenAmount, takerToken.decimals).integerValue()
    if (rawTakerAmount.gt(inputBalance)) setError(Errors.INSUFFICIENT_BALANCE)
    else if (error === Errors.INSUFFICIENT_BALANCE) setError(Errors.NO_ERROR)
  }, [usdBalance, oTokenBalance, takerToken, takerTokenAmount, action, error])

  // update input / output box when indicativeQuote updated
  useEffect(() => {
    if (lastUpdate !== Updates.Output) return
    if (!indicativeQuote) return
    if (isFinalized && !rfqOrder) return
    const quote = (isFinalized ? rfqOrder : indicativeQuote) as IndicativeQuote
    // update input
    const rawMakerAmount = fromTokenAmount(makerTokenAmount, makerToken.decimals).integerValue().toString()
    if (rawMakerAmount === quote.makerAmount) {
      const takerAmount = toTokenAmount(quote.takerAmount, takerToken.decimals)
      setInputTokenAmount(takerAmount)
    }
  }, [
    isFinalized,
    rfqOrder,
    indicativeQuote,
    lastUpdate,
    takerToken.decimals,
    makerToken.decimals,
    makerTokenAmount,
    setInputTokenAmount,
  ])

  useEffect(() => {
    if (lastUpdate !== Updates.Input) return
    if (!indicativeQuote) return
    if (isFinalized && !rfqOrder) return
    const quote = (isFinalized ? rfqOrder : indicativeQuote) as IndicativeQuote

    // fix input, recalculate output
    const rawTakerAmount = fromTokenAmount(takerTokenAmount, takerToken.decimals).integerValue().toString()
    if (rawTakerAmount === quote.takerAmount) {
      const makerAmount = toTokenAmount(quote.makerAmount, makerToken.decimals)
      setOutputTokenAmount(makerAmount)
    }
  }, [
    isFinalized,
    rfqOrder,
    indicativeQuote,
    lastUpdate,
    takerToken.decimals,
    takerTokenAmount,
    makerToken.decimals,
    setOutputTokenAmount,
  ])

  const finalizedQuote = useCallback(async () => {
    if (lastUpdate === Updates.Input) {
      // fix input, recalculate output
      const rawTakerAmount = fromTokenAmount(takerTokenAmount, takerToken.decimals).integerValue().toString()
      await requestFirmQuote(undefined, rawTakerAmount)
    } else {
      // fix output, update input
      const rawMakerAmount = fromTokenAmount(makerTokenAmount, makerToken.decimals).integerValue().toString()
      await requestFirmQuote(rawMakerAmount, undefined)
    }
    setIsFinalized(true)
  }, [requestFirmQuote, lastUpdate, takerTokenAmount, makerTokenAmount, makerToken, takerToken])

  // fill rfq order
  const fill = useCallback(async () => {
    setIsFilling(true)
    try {
      await fillRFQOrder(rfqOrder, fromTokenAmount(takerTokenAmount, takerToken.decimals).integerValue())
    } finally {
      setIsFilling(false)
    }
  }, [fillRFQOrder, rfqOrder, takerTokenAmount, takerToken])

  // check has enough input
  useEffect(() => {
    const inputRawAmount = fromTokenAmount(takerTokenAmount, takerToken.decimals)
    if (action === TradeAction.Buy) {
      setNeedApprove(usdcAllowance.lt(inputRawAmount))
    } else {
      setNeedApprove(oTokenAllowance.lt(inputRawAmount))
    }
  }, [action, oTokenAllowance, usdcAllowance, takerTokenAmount, takerToken])

  const closestExpry = useMemo(() => {
    return rfqOrder ? rfqOrder.expiry : '0'
  }, [rfqOrder])

  return (
    <>
      <Row>
        <Col sm={12} md={5}>
          <TextInput
            disabled={isFinalized}
            type="number"
            adornment={inputIcon}
            adornmentPosition="end"
            value={takerTokenAmount.toNumber()}
            onChange={handleInputChange}
            wide
          />
          <WarningText show={error !== Errors.NO_ERROR} text={error} />
        </Col>
        <Col sm={1} md={1} style={{ padding: '10px' }}>
          <IconArrowRight size="medium" />
        </Col>
        <Col sm={12} md={5}>
          <TextInput
            disabled={isFinalized}
            type="number"
            adornment={outputIcon}
            adornmentPosition="end"
            value={makerTokenAmount.toFixed()}
            onChange={handleOuputChange}
            wide
          />
        </Col>
      </Row>
      <SectionTitle title="Quote" />
      <TokenBalanceEntry
        label="Avg. Price"
        isLoading={isRequestingIndicative}
        amount={price.toFixed(4)}
        symbol={paymentToken.symbol}
      />
      <TokenBalanceEntry label="Impl. Vol" amount={(impliedV * 100).toFixed(4)} symbol={'%'} />
      <TokenBalanceEntry
        label="Maker"
        isLoading={isRequestingFirm}
        amount={isFinalized && rfqOrder ? <CustomIdentityBadge entity={rfqOrder.maker} /> : '-'}
        symbol={''}
      />
      <div style={{ display: 'flex', paddingTop: '5px' }}>
        <LabelText label={'Expires in'} minWidth={'150px'} />
        {isFinalized ? <Timer end={new Date(parseInt(closestExpry) * 1000)} /> : <> - </>}
      </div>

      <SectionTitle title="My Wallet" />
      <TokenBalanceEntry
        label="oToken Balance"
        amount={toTokenAmount(oTokenBalance, 8).toString()}
        symbol={simplifyOTokenSymbol(selectedOToken.symbol)}
      />
      <TokenBalanceEntry
        label="USD Balance"
        amount={toTokenAmount(usdBalance, paymentToken.decimals).toString()}
        symbol={paymentToken.symbol}
      />
      <br />

      <div style={{ display: 'flex', paddingTop: '20px' }}>
        {isFinalized ? (
          <>
            <Button
              disabled={
                needApprove || error !== Errors.NO_ERROR || takerTokenAmount.isZero() || takerTokenAmount.isNaN()
              }
              mode={action === TradeAction.Buy ? 'positive' : 'negative'}
              onClick={fill}
            >
              {' '}
              {isFilling ? <LoadingRing /> : action === TradeAction.Buy ? 'Confirm Buy' : 'Confirm Sell'}{' '}
            </Button>{' '}
            <Button label={'Cancel'} onClick={() => setIsFinalized(false)} />{' '}
          </>
        ) : (
          <Button disabled={takerTokenAmount.isZero() || takerTokenAmount.isNaN()} onClick={finalizedQuote}>
            {' '}
            {isRequestingFirm ? <LoadingRing /> : 'Finalize Offer'}{' '}
          </Button>
        )}

        {needApprove && (
          <Button
            label="approve"
            icon={isApproving ? <LoadingRing /> : <IconUnlock />}
            display="icon"
            onClick={approve}
          />
        )}
      </div>
    </>
  )
}
