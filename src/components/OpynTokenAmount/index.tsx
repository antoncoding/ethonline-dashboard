import React, { useState, useMemo } from 'react'

import { SubgraphToken, SubgraphOToken } from '../../types'
import { EmptyToken } from '../TokenDisplay'

import { TokenAmount, LinkBase, Modal, AddressField } from '@aragon/ui'

import ETH from '../../imgs/ETH.png'
import WBTC from '../../imgs/WBTC.png'
import oETH from '../../imgs/oETH.svg'
import oBTC from '../../imgs/oBTC.png'
import USDC from '../../imgs/USDC.png'
import USDT from '../../imgs/USDT.png'
import { simplifyOTokenSymbol } from '../../utils/others'

type TokenAmountProps = {
  token: SubgraphOToken | SubgraphToken | null
  amount: string
  chainId: number
}

export default function OpynTokenAmount({ token, amount, chainId }: TokenAmountProps) {
  const [open, setOpen] = useState(false)

  const imgUrl = useMemo(() => {
    return token === null
      ? null
      : token.symbol === 'USDC'
      ? USDC
      : token.symbol === 'USDT'
      ? USDT
      : token.symbol === 'WETH'
      ? ETH
      : token.symbol === 'WBTC'
      ? WBTC
      : (token as SubgraphOToken).underlyingAsset
      ? (token as SubgraphOToken).underlyingAsset.symbol === 'WETH'
        ? oETH
        : (token as SubgraphOToken).underlyingAsset.symbol === 'WBTC'
        ? oBTC
        : null
      : null
  }, [token])

  const symbol =
    token === null
      ? ''
      : (token as SubgraphOToken).strikePrice !== undefined
      ? simplifyOTokenSymbol(token?.symbol)
      : token?.symbol

  return token ? (
    <>
      <LinkBase onClick={() => setOpen(true)}>
        <TokenAmount
          address={token.id}
          amount={amount}
          chainId={chainId}
          symbol={symbol}
          decimals={token.decimals}
          iconUrl={imgUrl}
          digits={8}
        />
      </LinkBase>
      <Modal visible={open} onClose={() => setOpen(false)}>
        <AddressField address={token.id} />
      </Modal>
    </>
  ) : (
    <EmptyToken />
  )
}
