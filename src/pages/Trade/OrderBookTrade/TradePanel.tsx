import React, { useMemo, useState } from 'react'
import { Row, Col, Visible, Hidden } from 'react-grid-system'
import BigNumber from 'bignumber.js'
import { Box, Button, useTheme } from '@aragon/ui'

import MarketTicket from './MarketTicket'
import LimitTicket from './LimitTicket'

import { SubgraphOToken } from '../../../types'
import { simplifyOTokenSymbol } from '../../../utils/others'

import { TradeAction, MarketTypes, getWeth, getPrimaryPaymentToken } from '../../../constants'
import { useOTokenBalances, useTokenBalance } from '../../../hooks'
import { useConnectedWallet } from '../../../contexts/wallet'

type TradeDetailProps = {
  selectedOToken: SubgraphOToken | null
  action: TradeAction
  compact?: boolean // true when used in orderbook
  setAction: any
}

export default function TradePanel({ selectedOToken, action, setAction, compact }: TradeDetailProps) {
  const theme = useTheme()
  const [marketType, setMarketType] = useState(MarketTypes.Market)

  const { user, networkId } = useConnectedWallet()

  const [inputTokenAmount, setInputTokenAmount] = useState(new BigNumber(1))
  const [outputTokenAmount, setOutputTokenAmount] = useState(new BigNumber(0))

  const { balances: oTokenBalances } = useOTokenBalances(user, networkId)
  const usdBalance = useTokenBalance(getPrimaryPaymentToken(networkId).id, user, 15)
  const wethBalance = useTokenBalance(getWeth(networkId).id, user, 15)

  const titleText = useMemo(
    () =>
      `${action === TradeAction.Buy ? 'Buy' : 'Sell'} ${
        selectedOToken ? simplifyOTokenSymbol(selectedOToken?.symbol) : 'oToken'
      }`,
    [selectedOToken, action],
  )

  return (
    <Box heading={titleText}>
      <Row>
        <Visible xs sm md>
          <Col xs={12} style={{ padding: '15px' }}>
            <TradeType action={action} setAction={setAction} setMarketType={setMarketType} marketType={marketType} />
          </Col>
        </Visible>
        <Col sm={12} lg={compact ? 6.5 : 8} xl={compact ? 8 : 9}>
          {selectedOToken === null ? (
            <div style={{ color: theme.contentSecondary }}> Select an oToken to proceed </div>
          ) : marketType === MarketTypes.Market ? (
            <MarketTicket
              inputTokenAmount={inputTokenAmount}
              setInputTokenAmount={setInputTokenAmount}
              outputTokenAmount={outputTokenAmount}
              setOutputTokenAmount={setOutputTokenAmount}
              action={action}
              selectedOToken={selectedOToken}
              oTokenBalances={oTokenBalances}
              usdBalance={usdBalance}
              wethBalance={wethBalance}
            />
          ) : (
            <LimitTicket
              inputTokenAmount={inputTokenAmount}
              setInputTokenAmount={setInputTokenAmount}
              outputTokenAmount={outputTokenAmount}
              setOutputTokenAmount={setOutputTokenAmount}
              action={action}
              selectedOToken={selectedOToken}
              oTokenBalances={oTokenBalances}
              usdBalance={usdBalance}
            />
          )}
        </Col>
        <Hidden xs sm md>
          <Col lg={compact ? 5.5 : 4} xl={compact ? 4 : 3}>
            <TradeType action={action} setAction={setAction} setMarketType={setMarketType} marketType={marketType} />
          </Col>
        </Hidden>
      </Row>
    </Box>
  )
}

type TradeTypeProps = {
  action: TradeAction
  setAction: any
  marketType: MarketTypes
  setMarketType: any
}

function TradeType({ action, setAction, marketType, setMarketType }: TradeTypeProps) {
  return (
    <div style={{ display: 'flex' }}>
      <Button
        size="small"
        label={marketType === MarketTypes.Market ? 'Market' : 'Limit'}
        onClick={() =>
          marketType === MarketTypes.Market ? setMarketType(MarketTypes.Limit) : setMarketType(MarketTypes.Market)
        }
      />

      <Button
        size="small"
        label={action === TradeAction.Buy ? 'Buy' : 'Sell'}
        mode={action === TradeAction.Buy ? 'positive' : 'negative'}
        onClick={() => (action === TradeAction.Buy ? setAction(TradeAction.Sell) : setAction(TradeAction.Buy))}
      />
    </div>
  )
}
