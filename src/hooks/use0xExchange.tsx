import { useCallback, useMemo } from 'react'
import ReactGA from 'react-ga'
import BigNumber from 'bignumber.js'
import { useConnectedWallet } from '../contexts/wallet'
import { addresses, ZeroXEndpoint, SupportedNetworks } from '../constants'
import { useNotify } from './useNotify'
import { SignedOrder, SignedRfqOrder } from '../types'
import { useGasPrice } from './useGasPrice'
import { useCustomToast } from './useCustomToast'
// import { ZEROX_PROTOCOL_FEE_KEY, FeeTypes } from '../constants'

// import { getPreference } from '../utils/storage'

const v4orderUtils = require('@0x/protocol-utils')
const FEE_PERORDER_PER_GWEI = 0.00007
// const FEE_RECIPIENT = '0xd325e15a52b780698c45ca3bdb6c49444fe5b588'

const abi = require('../constants/abis/0xV4Exchange.json')

export function use0xExchange() {
  // const payWithWeth = useMemo(() => getPreference(ZEROX_PROTOCOL_FEE_KEY, FeeTypes.ETH) === FeeTypes.WETH, [])

  const toast = useCustomToast()
  const { networkId, web3, user } = useConnectedWallet()

  const track = useCallback(
    (action: string) => {
      const label = networkId === SupportedNetworks.Mainnet ? 'mainnet' : 'testnet'
      ReactGA.event({ category: 'trading', action, label })
    },
    [networkId],
  )

  const { notifyCallback } = useNotify()

  const httpEndpoint = useMemo(() => ZeroXEndpoint[networkId].http, [networkId])

  const { fast, fastest } = useGasPrice(5)

  const getGasPriceForOrders = useCallback(
    (orders: SignedOrder[]) => {
      const closestExpiry = Math.min(...orders.map(o => Number(o.expiry) - Date.now() / 1000))
      return closestExpiry < 120 ? fastest : fast
    },
    [fast, fastest],
  )

  /**
   * If any order is expiring within 2 mins, use fastest
   */
  const getProtocolFee = useCallback(
    (orderInfos: SignedOrder[]) => {
      const gasPrice = getGasPriceForOrders(orderInfos)
      return gasPrice.times(new BigNumber(orderInfos.length)).times(FEE_PERORDER_PER_GWEI)
    },
    [getGasPriceForOrders],
  )

  const createOrder = useCallback(
    async (
      makerToken: string,
      takerToken: string,
      makerAmount: BigNumber,
      takerAmount: BigNumber,
      expiry: number,
      takerAddress?: string,
    ) => {
      const salt = new BigNumber(Date.now()).integerValue().toString()
      const taker = takerAddress ? takerAddress : '0x0000000000000000000000000000000000000000'
      const order = new v4orderUtils.LimitOrder({
        chainId: networkId,
        makerToken,
        takerToken,
        makerAmount,
        takerAmount,
        // takerTokenFeeAmount,
        maker: user,
        taker,
        sender: '0x0000000000000000000000000000000000000000',
        // feeRecipient: FEE_RECIPIENT,
        // pool:
        expiry: new BigNumber(expiry).integerValue(),
        salt,
        // verifyingContract: addresses[networkId].zeroxExchange,
      })
      track('create-order')
      const signature = await order.getSignatureWithProviderAsync(
        web3.currentProvider as any,
        v4orderUtils.SignatureType.EIP712,
      )
      // const provider = new MetamaskSubprovider(web3.currentProvider as SupportedProvider)
      // return signatureUtils.ecSignOrderAsync(provider, order, user)
      // return signature;

      return {
        ...order,
        signature,
      }
    },
    [networkId, user, web3, track],
  )

  const fillOrders = useCallback(
    async (orders: SignedOrder[], amounts: BigNumber[]) => {
      if (!orders.length) return toast.error('No Orders selected')
      const exchange = new web3.eth.Contract(abi, addresses[networkId].zeroxExchange)

      const signatures = orders.map(order => order.signature)

      const gasPrice = getGasPriceForOrders(orders)
      const feeInEth = getProtocolFee(orders).toString()
      const amountsStr = amounts.map(amount => amount.toString())

      // change to batch Fill when it's live
      await exchange.methods
        .batchFillLimitOrders(orders, signatures, amountsStr, false)
        .send({
          from: user,
          value: web3.utils.toWei(feeInEth, 'ether'),
          gasPrice: web3.utils.toWei(gasPrice.toString(), 'gwei'),
        })
        .on('transactionHash', notifyCallback)

      track('fill-order')
    },
    [networkId, getProtocolFee, getGasPriceForOrders, notifyCallback, toast, user, web3, track],
  )

  const fillOrder = useCallback(
    async (order: SignedOrder, amount: BigNumber) => {
      const exchange = new web3.eth.Contract(abi, addresses[networkId].zeroxExchange)

      // const signature = order.signature

      const gasPrice = getGasPriceForOrders([order])
      const feeInEth = getProtocolFee([order]).toString()
      const amountStr = amount.toString()

      console.log(`order`, order)

      await exchange.methods
        .fillLimitOrder(order, order.signature, amountStr)
        .send({
          from: user,
          value: web3.utils.toWei(feeInEth, 'ether'),
          gasPrice: web3.utils.toWei(gasPrice.toString(), 'gwei'),
        })
        .on('transactionHash', notifyCallback)
      track('fill-order')
    },
    [networkId, getProtocolFee, getGasPriceForOrders, notifyCallback, user, web3, track],
  )

  const fillRFQOrder = useCallback(
    async (order: SignedRfqOrder | null, amount: BigNumber) => {
      if (!order) {
        toast.error('No Orde availalbe')
        return
      }
      const exchange = new web3.eth.Contract(abi, addresses[networkId].zeroxExchange)

      const gasPrice = fast
      const amountStr = amount.toString()

      await exchange.methods
        .fillRfqOrder(order, order.signature, amountStr)
        .send({
          from: user,
          gasPrice: web3.utils.toWei(gasPrice.toString(), 'gwei'),
        })
        .on('transactionHash', notifyCallback)
      track('fill-order')
    },
    [networkId, notifyCallback, user, web3, track, fast, toast],
  )

  const broadcastOrder = useCallback(
    async (order: SignedOrder) => {
      const url = `${httpEndpoint}sra/v4/order`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(order),
      })
      if (res.status === 200) return toast.success('Order successfully broadcasted')
      const jsonRes = await res.json()
      if (jsonRes.validationErrors) return toast.error(jsonRes.validationErrors[0].reason)

      toast.error(JSON.stringify(jsonRes))
    },
    [httpEndpoint, toast],
  )

  const cancelOrders = useCallback(
    async (orders: SignedOrder[], callback: Function) => {
      const exchange = new web3.eth.Contract(abi, addresses[networkId].zeroxExchange)

      await exchange.methods
        .batchCancelLimitOrders(orders)
        .send({
          from: user,
        })
        .on('transactionHash', notifyCallback)
      track('cancel-order')
      callback()
    },
    [web3, notifyCallback, networkId, track, user],
  )

  return { getProtocolFee, fillOrders, fillOrder, createOrder, broadcastOrder, cancelOrders, fillRFQOrder }
}
