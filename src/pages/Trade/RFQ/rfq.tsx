import React from 'react'
import { Row, Col, Hidden } from 'react-grid-system'
import { Box, Button, useTheme } from '@aragon/ui'

import MainTicket from './main'

import { SubgraphOToken } from '../../../types'
import { simplifyOTokenSymbol } from '../../../utils/others'

import { TradeAction, getPrimaryPaymentToken } from '../../../constants'
import { useOTokenBalances, useTokenBalance } from '../../../hooks'
import { useConnectedWallet } from '../../../contexts/wallet'

type RFQProps = {
  selectedOToken: SubgraphOToken | null
  action: TradeAction
  setAction: any
}

export default function RFQ({ selectedOToken, action, setAction }: RFQProps) {
  const theme = useTheme()

  const { user, networkId } = useConnectedWallet()
  const { balances: oTokenBalances } = useOTokenBalances(user, networkId)
  const usdBalance = useTokenBalance(getPrimaryPaymentToken(networkId).id, user, 15)

  return (
    <Box heading={`Trade ${selectedOToken ? simplifyOTokenSymbol(selectedOToken?.symbol) : 'oToken'}`}>
      <Row>
        <Col sm={12} lg={8} xl={9}>
          {selectedOToken === null ? (
            <div style={{ color: theme.contentSecondary }}> Select an oToken to proceed </div>
          ) : (
            <MainTicket
              action={action}
              selectedOToken={selectedOToken}
              oTokenBalances={oTokenBalances}
              usdBalance={usdBalance}
            />
          )}
        </Col>
        <Hidden xs sm md>
          <Col lg={4} xl={3}>
            <BuyOrSell action={action} setAction={setAction} />
          </Col>
        </Hidden>
      </Row>
    </Box>
  )
}

type BuyOrSell = {
  action: TradeAction
  setAction: any
}

// market buy / market sell / limit buy / limit sell
function BuyOrSell({ action, setAction }: BuyOrSell) {
  return (
    <div style={{ display: 'flex' }}>
      <Button
        size="small"
        label={'Buy'}
        mode={action === TradeAction.Buy ? 'positive' : 'normal'}
        onClick={() => setAction(TradeAction.Buy)}
      />
      <Button
        size="small"
        label={'Sell'}
        mode={action === TradeAction.Sell ? 'negative' : 'normal'}
        onClick={() => setAction(TradeAction.Sell)}
      />
    </div>
  )
}
