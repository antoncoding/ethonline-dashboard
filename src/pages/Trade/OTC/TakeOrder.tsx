import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { TextInput, Button, Timer, IconUnlock, LoadingRing } from '@aragon/ui'
import BigNumber from 'bignumber.js'
import { OTokenBalance, SignedOrder, SubgraphOToken, Token } from '../../../types'
import { getUSDC, ZEROX_PROTOCOL_FEE_KEY, FeeTypes, Errors, Spenders, ZERO_ADDR } from '../../../constants'

import SectionHeader from '../../../components/SectionHeader'
import LabelText from '../../../components/LabelText'
import TokenBalanceEntry from '../../../components/TokenBalanceEntry'

import { useConnectedWallet } from '../../../contexts/wallet'
import { toTokenAmount, fromTokenAmount } from '../../../utils/math'
import { getPreference } from '../../../utils/storage'
import { use0xExchange } from '../../../hooks/use0xExchange'
import WarningText from '../../../components/Warning'
import { useUserAllowance } from '../../../hooks/useAllowance'
import { useCustomToast } from '../../../hooks'

type TakerOrderProps = {
  oTokenBalances: OTokenBalance[] | null
  usdcBalance: BigNumber
  wethBalance: BigNumber
  allOtokens: SubgraphOToken[]
}

export default function TakerOrder({ oTokenBalances, wethBalance, usdcBalance, allOtokens }: TakerOrderProps) {
  const { getProtocolFee, fillOrder } = use0xExchange()

  const { networkId, user } = useConnectedWallet()

  const usdc = useMemo(() => getUSDC(networkId), [networkId])

  const toast = useCustomToast()

  const [encodedOrder, setEncodedOrder] = useState('')

  const [order, setOrder] = useState<null | SignedOrder>(null)

  const [makerAsset, setMakerAsset] = useState<Token | null>(null)
  const [takerAsset, setTakerAsset] = useState<Token | null>(null)

  const [isApproving, setIsApproving] = useState(false)

  const payFeeWithWeth = useMemo(() => getPreference(ZEROX_PROTOCOL_FEE_KEY, FeeTypes.ETH) === FeeTypes.WETH, [])

  const takerAssetBalance = useMemo(
    () =>
      takerAsset
        ? takerAsset?.symbol === 'USDC'
          ? usdcBalance
          : oTokenBalances?.find(b => b.token.id === takerAsset.id)?.balance || new BigNumber(0)
        : new BigNumber(0),
    [takerAsset, usdcBalance, oTokenBalances],
  )

  const balanceError = order
    ? takerAssetBalance.gte(order.takerAmount)
      ? Errors.NO_ERROR
      : Errors.INSUFFICIENT_BALANCE
    : Errors.NO_ERROR

  useEffect(() => {
    if (encodedOrder === '') return
    try {
      const order: SignedOrder = JSON.parse(new Buffer(encodedOrder, 'base64').toString(''))
      setOrder(order)
      // asset is either oToken or usdc
      const makerAsset = allOtokens.find(t => t.id === order.makerToken) || usdc
      const takerAsset = allOtokens.find(t => t.id === order.takerToken) || usdc
      setMakerAsset(makerAsset)
      setTakerAsset(takerAsset)
    } catch (error) {
      toast.error('Decode order failed')
    }
  }, [encodedOrder, allOtokens, usdcBalance, usdc, toast])

  // denominated in eth
  const protocolFee = useMemo(() => (order ? getProtocolFee([order]) : new BigNumber(0)), [getProtocolFee, order])
  const hasEnoughWeth = useMemo(() => wethBalance.gt(fromTokenAmount(protocolFee, 18)), [protocolFee, wethBalance])

  // get taker asset allowance
  const { approve, allowance } = useUserAllowance(takerAsset?.id || usdc.id, Spenders.ZeroXERC20Proxy)

  const needApprove = useMemo(() => (order ? new BigNumber(order.takerAmount).gt(allowance) : false), [
    order,
    allowance,
  ])

  const handleFillOrder = useCallback(async () => {
    if (!order) return toast.error('No order selected')
    await fillOrder(order, new BigNumber(order.takerAmount))
  }, [fillOrder, order, toast])

  const takable = useMemo(() => (order ? order.taker === ZERO_ADDR || order.taker.toLowerCase() === user : true), [
    order,
    user,
  ])

  const approveOToken = useCallback(async () => {
    if (!order) return toast.error('No order selected')
    setIsApproving(true)
    try {
      await approve(new BigNumber(order.takerAmount))
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsApproving(false)
    }
  }, [approve, order, toast])

  return (
    <>
      <SectionHeader title="Order" />
      <span style={{ opacity: 0.9, fontSize: 15 }}> Paste the order string you get from the order maker. </span>
      <TextInput wide onChange={event => setEncodedOrder(event.target.value)} />
      <WarningText show={!takable} text="You cannot take this order" />

      {order && (
        <>
          <SectionHeader title="Detail" />

          <TokenBalanceEntry
            label="Maker Asset"
            amount={toTokenAmount(order.makerAmount, makerAsset?.decimals || 8).toString()}
            symbol={makerAsset?.symbol || ''}
          />

          <TokenBalanceEntry
            label="Taker Asset"
            amount={toTokenAmount(order.takerAmount, takerAsset?.decimals || 8).toString()}
            symbol={takerAsset?.symbol || ''}
          />
          <WarningText show={balanceError !== Errors.NO_ERROR} text={balanceError} />

          <div style={{ display: 'flex', paddingTop: '5px' }}>
            <LabelText label={'Expires in'} minWidth={'150px'} />
            <Timer end={new Date(Number(order.expiry) * 1000)} />
          </div>

          {order.takerTokenFeeAmount !== '0' && (
            <TokenBalanceEntry
              label="Taker Fee"
              amount={toTokenAmount(order.takerTokenFeeAmount, takerAsset?.decimals || 8).toString()}
              symbol={takerAsset?.symbol || ''}
            />
          )}

          <TokenBalanceEntry
            label="Protocol Fee"
            amount={protocolFee.toString()}
            symbol={payFeeWithWeth ? 'WETH' : 'ETH'}
          />
          <WarningText show={payFeeWithWeth && !hasEnoughWeth} text={Errors.INSUFFICIENT_BALANCE} />

          <br />
          <div style={{ display: 'flex' }}>
            <Button
              disabled={
                (payFeeWithWeth && !hasEnoughWeth) || balanceError !== Errors.NO_ERROR || needApprove || !takable
              }
              mode="strong"
              label="Fill order"
              onClick={handleFillOrder}
            />

            {needApprove && (
              <Button
                label="approve"
                mode="positive"
                display="icon"
                icon={isApproving ? <LoadingRing /> : <IconUnlock />}
                onClick={approveOToken}
              />
            )}
          </div>
        </>
      )}
    </>
  )
}
