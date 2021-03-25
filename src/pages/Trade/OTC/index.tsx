import React, { useState, useEffect } from 'react'
import { Col, Row } from 'react-grid-system'
import ReactGA from 'react-ga'
import { Header, Tabs, Info } from '@aragon/ui'

import { useConnectedWallet } from '../../../contexts/wallet'
import { useOTokenBalances, useTokenBalance, useLiveOTokens } from '../../../hooks'
import { getPrimaryPaymentToken, SupportedNetworks } from '../../../constants'

import MakeOrder from './MakeOrder'
import TakerOrder from './TakeOrder'

export default function OTC() {
  useEffect(() => {
    ReactGA.pageview('trade/otc/')
  }, [])

  const { user, networkId } = useConnectedWallet()

  const { balances: oTokenBalances } = useOTokenBalances(user, networkId)
  const paymentTokenBalance = useTokenBalance(getPrimaryPaymentToken(networkId).id, user, 15)

  const { allOtokens } = useLiveOTokens()

  const [selectedTab, setSelectedTab] = useState(0)

  return networkId === SupportedNetworks.Kovan ? (
    <Info mode="error"> 0x V4 doesn't support kovan testnet, please switch network to Ropsten </Info>
  ) : (
    <>
      <Header primary={'OTC'} />

      <Row>
        <Col xl={3} lg={4} md={6} sm={12}>
          <Tabs selected={selectedTab} onChange={setSelectedTab} items={['Make Order', 'Take Order']} />
        </Col>
      </Row>

      {selectedTab === 0 && (
        <MakeOrder allOtokens={allOtokens} paymentTokenBalance={paymentTokenBalance} oTokenBalances={oTokenBalances} />
      )}
      {selectedTab === 1 && (
        <TakerOrder paymentTokenBalance={paymentTokenBalance} oTokenBalances={oTokenBalances} allOtokens={allOtokens} />
      )}
    </>
  )
}
