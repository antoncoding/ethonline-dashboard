import React, { useMemo, useState, useCallback, useEffect } from 'react'
import BigNumber from 'bignumber.js'
import { Row, Col } from 'react-grid-system'
import { Button, TextInput, IconArrowRight, IconUnlock, LoadingRing } from '@aragon/ui'
import EditOrderDeadlineModal from './EditOrderDeadlineModal'
import { SubgraphOToken, OTokenBalance } from '../../../types'

import { toTokenAmount, fromTokenAmount } from '../../../utils/math'

import { TradeAction, Errors, DeadlineUnit, Spenders } from '../../../constants'
import { useConnectedWallet } from '../../../contexts/wallet'
import { getPrimaryPaymentToken } from '../../../constants/addresses'

import USDCImgUrl from '../../../imgs/USDC.png'
import OTokenIcon from '../../../components/OTokenIcon'

import { use0xExchange } from '../../../hooks/use0xExchange'
import { useUserAllowance } from '../../../hooks/useAllowance'
import { simplifyOTokenSymbol } from '../../../utils/others'
import WarningText from '../../../components/Warning'
import TokenBalanceEntry from '../../../components/TokenBalanceEntry'
import LabelText from '../../../components/LabelText'

type MarketTicketProps = {
  action: TradeAction
  selectedOToken: SubgraphOToken
  oTokenBalances: OTokenBalance[] | null
  usdBalance: BigNumber
  inputTokenAmount: BigNumber
  setInputTokenAmount: React.Dispatch<React.SetStateAction<BigNumber>>
  outputTokenAmount: BigNumber
  setOutputTokenAmount: React.Dispatch<React.SetStateAction<BigNumber>>
}

export default function LimitTicket({
  action,
  selectedOToken,
  oTokenBalances,
  usdBalance,
  inputTokenAmount,
  setInputTokenAmount,
  outputTokenAmount,
  setOutputTokenAmount,
}: MarketTicketProps) {
  const { networkId } = useConnectedWallet()

  const paymentToken = useMemo(() => getPrimaryPaymentToken(networkId), [networkId])

  const { createOrder, broadcastOrder } = use0xExchange()

  const [deadline, setDeadline] = useState<number>(20)

  const [finalDeadlineUnit, setFinalDeadlineUnit] = useState<DeadlineUnit>(DeadlineUnit.Minutes)

  const [error, setError] = useState(Errors.NO_ERROR)

  const oTokenBalance = useMemo(
    () => oTokenBalances?.find(b => b.token.id === selectedOToken.id)?.balance ?? new BigNumber(0),
    [oTokenBalances, selectedOToken],
  )

  const inputToken = useMemo(() => (action === TradeAction.Buy ? paymentToken : selectedOToken), [
    paymentToken,
    selectedOToken,
    action,
  ])

  const outputToken = useMemo(() => (action === TradeAction.Buy ? selectedOToken : paymentToken), [
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
    const rawInputAmount = fromTokenAmount(inputTokenAmount, inputToken.decimals)
    setIsApproving(true)
    if (action === TradeAction.Buy) await approveUSDC(rawInputAmount)
    else await approveOToken(rawInputAmount)

    setIsApproving(false)
  }, [inputTokenAmount, inputToken, action, approveUSDC, approveOToken])

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

  const handleInputChange = useCallback(
    event => {
      try {
        const newAmount = new BigNumber(event.target.value)
        setInputTokenAmount(newAmount)
      } catch {}
    },
    [setInputTokenAmount],
  )

  const handleOuputChange = useCallback(
    event => {
      try {
        const newAmount = new BigNumber(event.target.value)
        setOutputTokenAmount(newAmount)
      } catch {}
    },
    [setOutputTokenAmount],
  )

  const price = useMemo(() => {
    if (action === TradeAction.Sell) {
      return inputTokenAmount.isZero() || inputTokenAmount.isNaN()
        ? new BigNumber(0)
        : outputTokenAmount.div(inputTokenAmount)
    } else {
      return outputTokenAmount.isZero() || outputTokenAmount.isNaN()
        ? new BigNumber(0)
        : inputTokenAmount.div(outputTokenAmount)
    }
  }, [inputTokenAmount, action, outputTokenAmount])

  // check balance error
  useEffect(() => {
    // if (error !== Errors.NO_ERROR || error !== Errors.INSUFFICIENT_BALANCE) return
    const inputBalance = action === TradeAction.Buy ? usdBalance : oTokenBalance
    const rawInputAmount = fromTokenAmount(inputTokenAmount, inputToken.decimals).integerValue()
    if (rawInputAmount.gt(inputBalance)) setError(Errors.INSUFFICIENT_BALANCE)
    else if (error === Errors.INSUFFICIENT_BALANCE) setError(Errors.NO_ERROR)
  }, [usdBalance, oTokenBalance, inputToken, inputTokenAmount, action, error])

  const makerFee = useMemo(
    () =>
      action === TradeAction.Buy
        ? fromTokenAmount(new BigNumber(1), inputToken.decimals).integerValue()
        : new BigNumber(0),
    [action, inputToken],
  )

  // check has enough input allowance
  useEffect(() => {
    const inputRawAmount = fromTokenAmount(inputTokenAmount, inputToken.decimals)
    if (action === TradeAction.Buy) {
      const fee = fromTokenAmount(new BigNumber(1), inputToken.decimals)
      setNeedApprove(usdcAllowance.lt(inputRawAmount.plus(fee)))
    } else {
      setNeedApprove(oTokenAllowance.lt(inputRawAmount))
    }
  }, [action, oTokenAllowance, usdcAllowance, inputTokenAmount, inputToken])

  const createAndPost = useCallback(async () => {
    const deadlineInSec = getDeadlineInSec(deadline, finalDeadlineUnit)
    const makerAssetAmount = fromTokenAmount(inputTokenAmount, inputToken.decimals).integerValue()
    const takerAssetAmount = fromTokenAmount(outputTokenAmount, outputToken.decimals).integerValue()
    const expiry = Date.now() / 1000 + deadlineInSec
    const order = await createOrder(
      inputToken.id,
      outputToken.id,
      // inputToken.id,
      makerAssetAmount,
      takerAssetAmount,
      // makerFee,
      expiry,
    )

    if (order) await broadcastOrder(order as any)
  }, [
    finalDeadlineUnit,
    createOrder,
    deadline,
    // makerFee,
    inputToken.decimals,
    inputToken.id,
    inputTokenAmount,
    outputToken.decimals,
    outputToken.id,
    outputTokenAmount,
    broadcastOrder,
  ])

  return (
    <>
      <Row>
        <Col sm={12} md={5}>
          <TextInput
            type="number"
            adornment={inputIcon}
            adornmentPosition="end"
            value={inputTokenAmount.toNumber()}
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
            type="number"
            adornment={outputIcon}
            adornmentPosition="end"
            value={outputTokenAmount.toFixed()}
            onChange={handleOuputChange}
            wide
          />
        </Col>
      </Row>
      <br />
      <TokenBalanceEntry label="Price" amount={price.toFixed(4)} symbol={`${paymentToken.symbol} / oToken`} />
      <TokenBalanceEntry
        label="Maker Fee"
        amount={toTokenAmount(makerFee, inputToken.decimals).toString()}
        symbol={inputToken.symbol}
      />

      <div style={{ display: 'flex', paddingTop: '5px' }}>
        <LabelText label={'Deadline'} minWidth={'150px'} />
        <div style={{ paddingRight: '5px' }}>{deadline.toString()}</div>
        <div style={{ opacity: 0.7, paddingRight: '15px' }}> {finalDeadlineUnit.toString()} </div>
        <EditOrderDeadlineModal setDeadline={setDeadline} setFinalDeadlineUnit={setFinalDeadlineUnit} />
      </div>

      <br />
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

      <div style={{ display: 'flex', paddingTop: '20px' }}>
        <Button
          disabled={needApprove || error !== Errors.NO_ERROR || inputTokenAmount.isZero() || inputTokenAmount.isNaN()}
          label={action === TradeAction.Buy ? 'Create Bid Order' : 'Create Ask Order'}
          mode={action === TradeAction.Buy ? 'positive' : 'negative'}
          onClick={createAndPost}
        />
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

function getDeadlineInSec(deadline: number, type: DeadlineUnit) {
  switch (type) {
    case DeadlineUnit.Seconds:
      return deadline
    case DeadlineUnit.Minutes:
      return deadline * 60
    case DeadlineUnit.Hours:
      return deadline * 3600
    case DeadlineUnit.Days:
      return deadline * 86400
  }
}
