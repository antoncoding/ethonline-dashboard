import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Row, Col } from 'react-grid-system'
import BigNumber from 'bignumber.js'
import {
  Button,
  TextInput,
  IconArrowRight,
  IconUnlock,
  LinkBase,
  TextCopy,
  EthIdenticon,
  useToast,
  LoadingRing,
} from '@aragon/ui'
import { SubgraphOToken } from '../../../types'

import { toTokenAmount, fromTokenAmount } from '../../../utils/math'

import { TradeAction, Errors, DeadlineUnit, Spenders } from '../../../constants'
import { useConnectedWallet } from '../../../contexts/wallet'
import { getUSDC, ZERO_ADDR } from '../../../constants/addresses'

import oETHIcon from '../../../imgs/oETH.svg'
import USDCIcon from '../../../imgs/USDC.png'
import { use0xExchange } from '../../../hooks/use0xExchange'
import { useUserAllowance } from '../../../hooks/useAllowance'

import EditOrderDeadlineModal from '../OrderBookTrade/EditOrderDeadlineModal'

import WarningText from '../../../components/Warning'
import TokenBalanceEntry from '../../../components/TokenBalanceEntry'
import LabelText from '../../../components/LabelText'
import SectionHeader from '../../../components/SectionHeader'
import Comment from '../../../components/Comment'

type TradeDetailProps = {
  oTokenBalance: BigNumber
  selectedOToken: SubgraphOToken
  usdcBalance: BigNumber
}

export default function MakeOrderDetail({ selectedOToken, usdcBalance, oTokenBalance }: TradeDetailProps) {
  const { networkId } = useConnectedWallet()
  const toast = useToast()
  const [action, setAction] = useState<TradeAction>(TradeAction.Buy)

  const [inputTokenAmount, setInputTokenAmount] = useState<BigNumber>(new BigNumber(0))
  const [outputTokenAmount, setOutputTokenAmount] = useState<BigNumber>(new BigNumber(0))

  const [takerAddress, setTakerAddress] = useState<string>(ZERO_ADDR)

  const [isApprovingUSDC, setIsApprovingUSDC] = useState(false)
  const [isApprovingOToken, setIsApprovingOToken] = useState(false)

  const paymentToken = useMemo(() => getUSDC(networkId), [networkId])

  const { createOrder } = use0xExchange()

  const [encodedOrder, setSignedOrder] = useState<null | string>(null)

  const [deadline, setDeadline] = useState<number>(20)

  const [finalDeadlineUnit, setFinalDeadlineUnit] = useState<DeadlineUnit>(DeadlineUnit.Minutes)

  const [error, setError] = useState(Errors.NO_ERROR)

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

  const inputTokenBalance = useMemo(() => (action === TradeAction.Buy ? usdcBalance : oTokenBalance), [
    action,
    usdcBalance,
    oTokenBalance,
  ])
  const outputTokenBalance = useMemo(() => (action === TradeAction.Buy ? oTokenBalance : usdcBalance), [
    action,
    oTokenBalance,
    usdcBalance,
  ])

  const [needApproveInputToken, setNeedApprove] = useState(true)
  const { allowance: usdcAllowance, approve: approveUSDC } = useUserAllowance(paymentToken.id, Spenders.ZeroXERC20Proxy)
  const { allowance: oTokenAllowance, approve: approveOTokenZX } = useUserAllowance(
    selectedOToken.id,
    Spenders.ZeroXERC20Proxy,
  )

  // 1/1000 as fee.
  const makerFee = useMemo(() => {
    const inputPercentage = fromTokenAmount(inputTokenAmount, paymentToken.decimals)
      .div(new BigNumber(1000))
      .integerValue()
    const outputPercentage = fromTokenAmount(outputTokenAmount, paymentToken.decimals)
      .div(new BigNumber(1000))
      .integerValue()
    const minFee = fromTokenAmount(new BigNumber(1), paymentToken.decimals)
    return action === TradeAction.Buy ? BigNumber.max(inputPercentage, minFee) : BigNumber.max(outputPercentage, minFee)
  }, [action, inputTokenAmount, outputTokenAmount, paymentToken])

  const approveUSDCAndFee = useCallback(async () => {
    setIsApprovingUSDC(true)
    try {
      if (action === TradeAction.Buy) {
        const rawInputAmount = fromTokenAmount(inputTokenAmount, inputToken.decimals)
        const totalToApprove = makerFee.plus(rawInputAmount)
        await approveUSDC(totalToApprove)
      } else {
        await approveUSDC(makerFee)
      }
    } catch {
      setIsApprovingUSDC(false)
    }
  }, [makerFee, action, inputToken, inputTokenAmount, approveUSDC])

  const approveOToken = useCallback(async () => {
    setIsApprovingOToken(true)
    try {
      const rawInputAmount = fromTokenAmount(inputTokenAmount, inputToken.decimals)
      await approveOTokenZX(rawInputAmount)
    } catch {
      setIsApprovingOToken(false)
    }
  }, [inputTokenAmount, inputToken, approveOTokenZX])

  const inputIcon = useMemo(
    () => <img alt="inputtoken" width={25} src={action === TradeAction.Buy ? USDCIcon : oETHIcon} />,
    [action],
  )

  const outputIcon = useMemo(
    () => <img alt="outputtoken" width={25} src={action === TradeAction.Buy ? oETHIcon : USDCIcon} />,
    [action],
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
    const inputBalance = action === TradeAction.Buy ? usdcBalance : oTokenBalance
    const rawInputAmount = fromTokenAmount(inputTokenAmount, inputToken.decimals).integerValue()
    if (rawInputAmount.gt(inputBalance)) setError(Errors.INSUFFICIENT_BALANCE)
    else if (error === Errors.INSUFFICIENT_BALANCE) setError(Errors.NO_ERROR)
  }, [usdcBalance, oTokenBalance, inputToken, inputTokenAmount, action, error])

  // if action === buy, this will always be false
  const needApproveUSDCForFee = useMemo(() => (action === TradeAction.Sell ? makerFee.gt(usdcAllowance) : false), [
    makerFee,
    usdcAllowance,
    action,
  ])

  // check has enough input allowance
  useEffect(() => {
    const inputRawAmount = fromTokenAmount(inputTokenAmount, inputToken.decimals)
    if (action === TradeAction.Buy) {
      setNeedApprove(usdcAllowance.lt(inputRawAmount.plus(makerFee)))
    } else {
      setNeedApprove(oTokenAllowance.lt(inputRawAmount))
    }
  }, [action, oTokenAllowance, usdcAllowance, inputTokenAmount, inputToken, makerFee])

  const createEncodedOrder = useCallback(async () => {
    const deadlineInSec = getDeadlineInSec(deadline, finalDeadlineUnit)
    const makerAssetAmount = fromTokenAmount(inputTokenAmount, inputToken.decimals).integerValue()
    const takerAssetAmount = fromTokenAmount(outputTokenAmount, outputToken.decimals).integerValue()
    const expiry = Date.now() / 1000 + deadlineInSec
    const order = await createOrder(
      inputToken.id,
      outputToken.id,
      paymentToken.id,
      makerAssetAmount,
      takerAssetAmount,
      makerFee,
      expiry,
      takerAddress,
    )
    const objJsonStr = JSON.stringify(order)
    const encodedOrder = Buffer.from(objJsonStr).toString('base64')
    setSignedOrder(encodedOrder)
    toast('Order successfully created 🎉')
  }, [
    toast,
    finalDeadlineUnit,
    createOrder,
    deadline,
    makerFee,
    inputToken.decimals,
    inputToken.id,
    inputTokenAmount,
    outputToken.decimals,
    outputToken.id,
    outputTokenAmount,
    takerAddress,
    paymentToken.id,
  ])

  return (
    <>
      <Comment text="Side" padding={15} />
      <Row>
        <Col>
          <Button
            label="Buy"
            onClick={() => setAction(TradeAction.Buy)}
            mode={action === TradeAction.Buy ? 'positive' : 'normal'}
          />
          <Button
            label="Sell"
            onClick={() => setAction(TradeAction.Sell)}
            mode={action === TradeAction.Sell ? 'negative' : 'normal'}
          />
        </Col>
      </Row>

      {/* Input Output Amount Row */}
      <Comment text="Amount" padding={15} />
      <Row>
        <Col xl={3} lg={4} md={4} sm={5}>
          <TextInput
            type="number"
            adornment={inputIcon}
            adornmentPosition="end"
            value={inputTokenAmount.toNumber()}
            onChange={handleInputChange}
          />
          <LinkBase
            style={{ fontSize: 12, opacity: 0.7 }}
            onClick={() => {
              setInputTokenAmount(toTokenAmount(inputTokenBalance, inputToken.decimals))
            }}
          >
            {' '}
            Balance: {toTokenAmount(inputTokenBalance, inputToken.decimals).toFixed(4)}
          </LinkBase>
          <WarningText show={error !== Errors.NO_ERROR} text={error} />
        </Col>
        <Col lg={1} xl={1} style={{ paddingTop: '10px' }}>
          <IconArrowRight size="medium" />
        </Col>
        <Col xl={3} lg={4} md={4} sm={5}>
          <TextInput
            type="number"
            adornment={outputIcon}
            adornmentPosition="end"
            value={outputTokenAmount.toFixed()}
            onChange={handleOuputChange}
          />
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {' '}
            Balance: {toTokenAmount(outputTokenBalance, outputToken.decimals).toFixed(4)}{' '}
          </div>
        </Col>
      </Row>

      <Comment text="Taker Address" padding={15} />
      <Row>
        <Col xl={5} lg={5} md={6} sm={8}>
          <TextInput
            type="string"
            value={takerAddress}
            adornment={<EthIdenticon address={takerAddress} scale={1} radius={3} soften={0.7} />}
            adornmentPosition="end"
            onChange={event => setTakerAddress(event.target.value)}
            wide
          />
        </Col>
      </Row>

      <SectionHeader title="Detail" />
      <TokenBalanceEntry label="Price" amount={price.toFixed(4)} symbol="USDC / oToken" />
      <TokenBalanceEntry
        label="Maker Fee"
        amount={toTokenAmount(makerFee, paymentToken.decimals).toString()}
        symbol={paymentToken.symbol}
      />

      <div style={{ display: 'flex' }}>
        <LabelText label={'Deadline'} minWidth={'150px'} />
        <div style={{ paddingRight: '5px' }}>{deadline.toString()}</div>
        <div style={{ opacity: 0.7, paddingRight: '15px' }}> {finalDeadlineUnit.toString()} </div>
        <EditOrderDeadlineModal setDeadline={setDeadline} setFinalDeadlineUnit={setFinalDeadlineUnit} />
      </div>

      <br />

      <div style={{ display: 'flex' }}>
        <Button
          disabled={
            needApproveInputToken ||
            error !== Errors.NO_ERROR ||
            inputTokenAmount.isZero() ||
            inputTokenAmount.isNaN() ||
            needApproveUSDCForFee // need to enable maker fee
          }
          label={'Generate Order'}
          mode="strong"
          onClick={createEncodedOrder}
        />
        {/* Need to enable usdc in the following: it's a buy or sell nned approve USDC for fee */}
        {((action === TradeAction.Buy && needApproveInputToken) || needApproveUSDCForFee) && (
          <Button
            label="approve-fee"
            icon={isApprovingUSDC ? <LoadingRing /> : <IconUnlock />}
            display="icon"
            onClick={approveUSDCAndFee}
          />
        )}

        {/* Need to enable oToken if it's a sell order. */}
        {action === TradeAction.Sell && needApproveInputToken && (
          <Button
            label="approve-otoken"
            icon={isApprovingOToken ? <LoadingRing /> : <IconUnlock />}
            display="icon"
            onClick={approveOToken}
          />
        )}

        <br />
      </div>

      {encodedOrder && (
        <>
          <SectionHeader title="Result" />
          <Comment padding={0} text="Send the following string to the taker." />
          <TextCopy value={encodedOrder} />
        </>
      )}
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
