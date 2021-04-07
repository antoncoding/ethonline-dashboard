import React, { useMemo, useState, useCallback, useEffect } from 'react'
import ReactGA from 'react-ga'
import BigNumber from 'bignumber.js'
import { useParams } from 'react-router-dom'
import {
  TextInput,
  Button,
  DataView,
  Tag,
  IconCirclePlus,
  IconCircleMinus,
  IconTrash,
  DropDown,
  LoadingRing,
  LinkBase,
} from '@aragon/ui'
import History from './history'

import { useConnectedWallet } from '../../../contexts/wallet'
import Header from '../../../components/Header'
import CustomIdentityBadge from '../../../components/CustomIdentityBadge'

import useAsyncMemo from '../../../hooks/useAsyncMemo'
import { useTokenByAddress } from '../../../hooks/useToken'
import { useOTokenBalances } from '../../../hooks/useOTokenBalances'
import { useTokenBalance } from '../../../hooks/useTokenBalance'
import { useLiveOTokens } from '../../../hooks/useOTokens'
import { useExpiryPriceData } from '../../../hooks/useExpiryPriceData'
import { useAuthorizedOperators } from '../../../hooks/useAuthorizedOperators'

import { getVault } from '../../../utils/graph'
import { toTokenAmount, fromTokenAmount } from '../../../utils/math'
import { isExpired, isSettlementAllowed } from '../../../utils/others'
import { ZERO_ADDR, tokens, getPayableProxyAddr, getWeth } from '../../../constants/addresses'
import { SubgraphOToken } from '../../../types'
import { useController } from '../../../hooks/useController'
import { useCustomToast } from '../../../hooks'

export default function VaultDetail() {
  useEffect(() => {
    ReactGA.pageview('account/vault/')
  }, [])

  const [vaultExpiry, setVaultExpiry] = useState<string>('0')
  const [isLoading, setIsLoading] = useState(true)

  const [isSendingTx, setIsSendingTx] = useState(false)

  const [changeCollateralAmount, setChangeCollateralAmount] = useState(new BigNumber(0))
  const [changeLongAmount, setChangeLongAmount] = useState(new BigNumber(0))
  const [changeShortAmount, setChangeShortAmount] = useState(new BigNumber(0))

  const [pendingCollateralAmount, setPendingCollateralAmount] = useState('')
  const [pendingLongAmount, setPendingLongAmount] = useState('')
  const [pendingShortAmount, setPendingShortAmount] = useState('')

  // for dropdown options
  const [selectedCollateralIndex, setSelectedCollateralIndex] = useState(0)
  const [selectedLong, setLongOToken] = useState<SubgraphOToken | null>(null)
  const [selectedShort, setShortOToken] = useState<SubgraphOToken | null>(null)

  const { networkId, user } = useConnectedWallet()
  const { owner, vaultId } = useParams()
  const toast = useCustomToast()

  const [fetchCount, setFetchCount] = useState(0)
  const refetch = useCallback(() => {
    setFetchCount(c => c + 1)
  }, [setFetchCount])

  // get oracle data to determine if a vault is ready to settle
  const { allOracleAssets } = useExpiryPriceData()

  const vaultDetail = useAsyncMemo(
    async () => {
      const result = await getVault(networkId, owner, vaultId, toast.error)
      setIsLoading(false)
      return result
    },
    null,
    [networkId, owner, toast, vaultId, fetchCount],
  )

  const { allOtokens } = useLiveOTokens()
  const { balances } = useOTokenBalances(user, networkId)

  const controller = useController()

  const isAuthorized = useMemo(() => {
    if (vaultDetail === null) return false
    else if (owner === user) return true
    else return vaultDetail.owner.operators.map(o => o.operator.id).includes(user)
  }, [vaultDetail, owner, user])

  const { hasAuthorizedPayalbeProxy } = useAuthorizedOperators(user)

  const collateralTokens = useMemo(
    () => (hasAuthorizedPayalbeProxy ? tokens[networkId] : tokens[networkId].filter(t => t.symbol !== 'ETH')),
    [hasAuthorizedPayalbeProxy, networkId],
  )

  const collateralToken = useTokenByAddress(
    vaultDetail && vaultDetail.collateralAsset && vaultDetail.collateralAsset.symbol !== 'WETH'
      ? vaultDetail.collateralAsset.id
      : collateralTokens[selectedCollateralIndex].id,
    networkId,
  )

  const shortOtoken = useMemo(() => (vaultDetail && vaultDetail.shortOToken) || selectedShort || null, [
    vaultDetail,
    selectedShort,
  ])

  const longOtoken = useMemo(() => (vaultDetail && vaultDetail.longOToken) || selectedLong || null, [
    vaultDetail,
    selectedLong,
  ])

  const collateralBalance = useTokenBalance(collateralToken.id, user, 20)

  const longBalance = useMemo(() => {
    if (!balances) return new BigNumber(0)
    const target = balances?.find(balanceObj => balanceObj.token.id === longOtoken?.id)
    return target ? target.balance : new BigNumber(0)
  }, [balances, longOtoken])

  const shortBalance = useMemo(() => {
    if (!balances) return new BigNumber(0)
    const target = balances?.find(balanceObj => balanceObj.token.id === shortOtoken?.id)
    return target ? target.balance : new BigNumber(0)
  }, [balances, shortOtoken])

  // set collateral type when short or long is selected first
  useEffect(() => {
    if (shortOtoken) {
      setVaultExpiry(shortOtoken.expiryTimestamp)
      const collateralIdx = collateralTokens.findIndex(token => token.id === shortOtoken.collateralAsset.id)
      setSelectedCollateralIndex(collateralIdx)
    } else if (longOtoken) {
      setVaultExpiry(longOtoken.expiryTimestamp)
      const collateralIdx = collateralTokens.findIndex(token => token.id === longOtoken.collateralAsset.id)
      setSelectedCollateralIndex(collateralIdx)
    } else {
      setVaultExpiry('0')
    }
  }, [networkId, shortOtoken, longOtoken, setVaultExpiry, collateralTokens])

  // short tokens to be shown in dropdown
  const allShorts = useMemo(() => {
    if (!allOtokens) return []

    const sameCollateral = allOtokens.filter(
      o =>
        o.collateralAsset.id === collateralToken.id ||
        (collateralToken.id === ZERO_ADDR && o.collateralAsset.symbol === 'WETH'),
    )

    const sameExpiry = sameCollateral.filter(o => o.expiryTimestamp === vaultExpiry || vaultExpiry === '0')

    return sameExpiry
  }, [allOtokens, collateralToken, vaultExpiry])

  // long tokens needs to be something that user have in their wallet.
  const allLongs = useMemo(() => {
    if (!allOtokens) return []
    if (!balances) return allShorts
    // which user has balance
    const hasBalance = allShorts.filter(short => {
      const target = balances.find(b => b.token.id === short.id)
      return target !== undefined && target.balance.gt(new BigNumber(0))
    })
    return hasBalance
  }, [allOtokens, balances, allShorts])

  const pushAddCollateral = useCallback(() => {
    // if using eth, from address is payable proxy
    let from = user
    const proxy = getPayableProxyAddr(networkId)
    if (collateralToken.id === ZERO_ADDR) {
      if (!proxy) return toast.error('Trying to use native token but cant find payable proxy')
      from = proxy.address
    }
    controller.pushAddCollateralArg(
      user,
      vaultId,
      from,
      collateralToken.id,
      fromTokenAmount(changeCollateralAmount, collateralToken.decimals),
    )

    setChangeCollateralAmount(new BigNumber(0))
    setPendingCollateralAmount(` + ${changeCollateralAmount.toString()}`)
  }, [collateralToken, controller, user, vaultId, changeCollateralAmount, networkId, toast])

  const pushRemoveCollateral = useCallback(() => {
    let to = user
    const proxy = getPayableProxyAddr(networkId)
    if (collateralToken.id === ZERO_ADDR) {
      if (!proxy) return toast.error('Trying to use native token but cant find payable proxy')
      to = proxy.address
    }
    controller.pushRemoveCollateralArg(
      user,
      vaultId,
      to,
      collateralToken.id,
      fromTokenAmount(changeCollateralAmount, collateralToken.decimals),
    )
    setChangeCollateralAmount(new BigNumber(0))
    setPendingCollateralAmount(` - ${changeCollateralAmount.toString()}`)
  }, [
    controller,
    user,
    vaultId,
    collateralToken.id,
    collateralToken.decimals,
    changeCollateralAmount,
    networkId,
    toast,
  ])

  const pushAddLong = useCallback(() => {
    if (!longOtoken) {
      toast.info('No long token selected')
      return
    }
    const oToken = vaultDetail && vaultDetail.longOToken ? vaultDetail.longOToken.id : longOtoken.id
    controller.pushAddLongArg(user, vaultId, user, oToken, fromTokenAmount(changeLongAmount, 8))
    setChangeLongAmount(new BigNumber(0))
    setPendingLongAmount(` + ${changeLongAmount.toString()}`)
  }, [toast, vaultDetail, longOtoken, controller, user, vaultId, changeLongAmount])

  const pushRemoveLong = useCallback(() => {
    if (!longOtoken) {
      toast.info('No long token selected')
      return
    }
    const oToken = vaultDetail && vaultDetail.longOToken ? vaultDetail.longOToken.id : longOtoken.id
    controller.pushRemoveLongArg(user, vaultId, user, oToken, fromTokenAmount(changeLongAmount, 8))
    setChangeLongAmount(new BigNumber(0))
    setPendingLongAmount(` - ${changeLongAmount.toString()}`)
  }, [toast, vaultDetail, longOtoken, controller, user, vaultId, changeLongAmount])

  const pushMint = useCallback(() => {
    if (!shortOtoken) {
      toast.info('No short token selected')
      return
    }
    const oToken = vaultDetail && vaultDetail.shortOToken ? vaultDetail.shortOToken.id : shortOtoken.id
    controller.pushMintArg(user, vaultId, user, oToken, fromTokenAmount(changeShortAmount, 8))
    setChangeShortAmount(new BigNumber(0))
    setPendingShortAmount(` + ${changeShortAmount.toString()}`)
  }, [toast, vaultDetail, shortOtoken, controller, user, vaultId, changeShortAmount])

  const pushBurn = useCallback(async () => {
    if (!shortOtoken) {
      toast.info('No short token selected')
      return
    }
    const oToken = vaultDetail && vaultDetail.shortOToken ? vaultDetail.shortOToken.id : shortOtoken.id
    controller.pushBurnArg(user, vaultId, user, oToken, fromTokenAmount(changeShortAmount, 8))
    setChangeShortAmount(new BigNumber(0))
    setPendingShortAmount(` - ${changeShortAmount.toString()}`)
  }, [toast, vaultDetail, shortOtoken, controller, user, vaultId, changeShortAmount])

  const expired = useMemo(() => {
    if (!vaultDetail) return false

    if (vaultDetail.shortOToken && isExpired(vaultDetail.shortOToken)) return true

    if (vaultDetail.longOToken && isExpired(vaultDetail.longOToken)) return true

    return false
  }, [vaultDetail])

  const settleAllowed = useMemo(() => {
    if (!vaultDetail) return false

    if (vaultDetail.shortOToken && isSettlementAllowed(vaultDetail.shortOToken, allOracleAssets)) return true

    if (vaultDetail.longOToken && isSettlementAllowed(vaultDetail.longOToken, allOracleAssets)) return true

    return false
  }, [vaultDetail, allOracleAssets])

  const simpleSettle = useCallback(async () => {
    await controller.settleBatch(user, [vaultId], user)
  }, [controller, user, vaultId])

  const renderRow = useCallback(
    ({
      label,
      symbol,
      asset,
      amount,
      balance,
      decimals,
      onInputChange,
      inputValue,
      onClickAdd,
      onClickMinus,
      dropdownSelected,
      dropdownOnChange,
      dropdownItems,
      pendingAmount,
    }) => {
      const amountToDisplay = amount ? (
        <div>
          {' '}
          {toTokenAmount(new BigNumber(amount), decimals).toFixed(6)}{' '}
          <span style={{ opacity: 0.5 }}> {pendingAmount} </span>{' '}
        </div>
      ) : (
        <div>
          0 <span style={{ opacity: 0.5 }}> {pendingAmount} </span>{' '}
        </div>
      )
      const pendingBalance = label === 'Short' ? pendingAmount : inversePendingAmountString(pendingAmount)
      const balanceToDisplay = (
        <div>
          {' '}
          {toTokenAmount(balance, decimals).toFixed(6)} <span style={{ opacity: 0.5 }}> {pendingBalance} </span>{' '}
        </div>
      )

      const weth = getWeth(networkId)
      const ethIdx = collateralTokens.findIndex(t => t.id === ZERO_ADDR)
      const wethIdx = collateralTokens.findIndex(t => t.id === weth.id)
      const assetOrDropDwon = asset ? (
        asset === weth.id && hasAuthorizedPayalbeProxy ? (
          <div>
            <Button
              onClick={() => {
                setSelectedCollateralIndex(wethIdx)
              }}
              mode={selectedCollateralIndex === wethIdx ? 'positive' : 'normal'}
            >
              {' '}
              WETH{' '}
            </Button>
            <Button
              onClick={() => {
                setSelectedCollateralIndex(ethIdx)
              }}
              mode={selectedCollateralIndex === ethIdx ? 'positive' : 'normal'}
            >
              {' '}
              ETH{' '}
            </Button>
          </div>
        ) : (
          <CustomIdentityBadge shorten={true} entity={asset} label={symbol} />
        )
      ) : (
        <DropDown
          disabled={dropdownItems.length === 0}
          placeholder={dropdownItems.length === 0 ? 'No Asset available' : 'Select an item'}
          items={dropdownItems}
          selected={dropdownSelected}
          onChange={dropdownOnChange}
        />
      )

      return [
        <div style={{ opacity: 0.8 }}> {label} </div>,
        assetOrDropDwon,
        // balanceToDisplay,
        <LinkBase onClick={() => onInputChange(toTokenAmount(balance, decimals))}> {balanceToDisplay} </LinkBase>,
        amountToDisplay,
        <>
          <TextInput
            type="number"
            disabled={expired}
            onChange={event => onInputChange(event.target.value)}
            value={inputValue}
          />
          <Button label="Add" disabled={expired} display="icon" icon={<IconCirclePlus />} onClick={onClickAdd} />
          <Button label="Remove" disabled={expired} display="icon" icon={<IconCircleMinus />} onClick={onClickMinus} />
        </>,
      ]
    },
    [expired, hasAuthorizedPayalbeProxy, networkId, selectedCollateralIndex, collateralTokens],
  )

  const onClickOperate = useCallback(() => {
    console.log(`onClickOperate, triggered`)
    setIsSendingTx(true)
    controller.operateCache(
      () => {
        setIsSendingTx(false)
        refetch()
        setPendingCollateralAmount('')
        setPendingLongAmount('')
        setPendingShortAmount('')
      },
      () => {
        setIsSendingTx(false)
        refetch()
      },
    )
  }, [refetch, controller])

  return (
    <>
      <Header
        primary={
          <div style={{ fontSize: 26 }}>
            Vault Detail{' '}
            {isAuthorized && (
              <span style={{ paddingBottom: 10 }}>
                <Tag mode="new">My vault</Tag>
              </span>
            )}
          </div>
        }
        secondary={
          expired ? (
            <Button disabled={!settleAllowed} label="Settle" onClick={simpleSettle} />
          ) : (
            <div style={{ display: 'flex' }}>
              <Button
                label={'operate'}
                mode="strong"
                disabled={controller.actions.length === 0 || isSendingTx}
                onClick={onClickOperate}
              >
                {' '}
                Operate{' '}
                {isSendingTx ? (
                  <LoadingRing />
                ) : (
                  <span style={{ paddingLeft: '7px' }}>
                    <Tag>{controller.actions.length}</Tag>
                  </span>
                )}
              </Button>
              <Button
                label={'trash'}
                disabled={controller.actions.length === 0}
                display="icon"
                icon={<IconTrash />}
                onClick={() => {
                  controller.cleanActionCache()
                  setPendingCollateralAmount('')
                  setPendingLongAmount('')
                  setPendingShortAmount('')
                }}
              />
            </div>
          )
        }
      />
      <DataView
        mode="table"
        status={isLoading ? 'loading' : 'default'}
        fields={['type', 'asset', 'wallet balance', 'vault balance', '']}
        entries={[
          {
            label: 'Collateral',
            decimals: collateralToken.decimals,
            symbol: collateralToken.symbol,
            asset: vaultDetail?.collateralAsset?.id,
            amount: vaultDetail?.collateralAmount,
            pendingAmount: pendingCollateralAmount,
            inputValue: changeCollateralAmount,
            onInputChange: value =>
              value ? setChangeCollateralAmount(new BigNumber(value)) : setChangeCollateralAmount(new BigNumber(0)),
            onClickAdd: pushAddCollateral,
            onClickMinus: pushRemoveCollateral,
            dropdownSelected: selectedCollateralIndex,
            dropdownOnChange: setSelectedCollateralIndex,
            dropdownItems: collateralTokens.map(o => o.symbol),
            balance: collateralBalance,
          },
          {
            label: 'Long',
            decimals: 8,
            symbol: vaultDetail?.longOToken?.symbol,
            asset: vaultDetail?.longOToken?.id,
            amount: vaultDetail?.longAmount,
            pendingAmount: pendingLongAmount,
            inputValue: changeLongAmount,
            onInputChange: value =>
              value ? setChangeLongAmount(new BigNumber(value)) : setChangeLongAmount(new BigNumber(0)),
            onClickAdd: pushAddLong,
            onClickMinus: pushRemoveLong,
            dropdownSelected: longOtoken ? allLongs.findIndex(o => o.id === longOtoken.id) : -1,
            dropdownOnChange: (idx: number) => {
              if (idx === -1 || !allLongs[idx]) setLongOToken(null)
              else setLongOToken(allLongs[idx])
            },
            dropdownItems: allLongs.map(o => o.symbol),
            balance: longBalance,
          },
          {
            label: 'Short',
            decimals: 8,
            symbol: vaultDetail?.shortOToken?.symbol,
            asset: vaultDetail?.shortOToken?.id,
            amount: vaultDetail?.shortAmount,
            pendingAmount: pendingShortAmount,
            inputValue: changeShortAmount,
            onInputChange: value =>
              value ? setChangeShortAmount(new BigNumber(value)) : setChangeShortAmount(new BigNumber(0)),
            onClickAdd: pushMint,
            onClickMinus: pushBurn,
            dropdownSelected: shortOtoken ? allShorts.findIndex(o => o.id === shortOtoken.id) : -1,
            dropdownOnChange: (idx: number) => {
              if (idx === -1 || !allShorts[idx]) setShortOToken(null)
              else setShortOToken(allShorts[idx])
            },
            dropdownItems: allShorts.map(o => o.symbol),
            balance: shortBalance,
          },
        ]}
        renderEntry={renderRow}
      />
      <br />
      <br />
      <History />
    </>
  )
}

function inversePendingAmountString(amount: string): string {
  if (amount.includes('-')) return amount.replace('-', '+')
  else if (amount.includes('+')) return amount.replace('+', '-')
  else return amount
}
