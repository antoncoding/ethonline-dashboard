import React, { useEffect } from 'react'
import ReactGA from 'react-ga'
import { Info } from '@aragon/ui'
import { useHistory } from 'react-router-dom'
import { Container, Row, Col } from 'react-grid-system'
import BoxButton from '../../components/BoxButton'

import { Header, IconCopy, IconSwap, IconGroup } from '@aragon/ui'

import Comment from '../../components/Comment'
import { useConnectedWallet } from '../../contexts/wallet'
import { SupportedNetworks } from '../../constants'

function TradePage() {
  const history = useHistory()
  const { networkId } = useConnectedWallet()
  useEffect(() => {
    ReactGA.pageview('/trade/')
  }, [])
  return (
    <Container>
      <Header primary="Trade" />
      <Comment padding={0} text="Trade oTokens with 0x protocol!" />
      <br />
      <br />
      {networkId === SupportedNetworks.Kovan ? (
        <Info mode="error"> 0x V4 doesn't support kovan testnet, please switch to Ropsten testnet to proceed </Info>
      ) : (
        <>
          <Row>
            <Col sm={12} md={6} lg={4}>
              <BoxButton
                title="Swap"
                description="Simple swap between oToken and USDC"
                icon={<IconSwap size="large" />}
                onClick={() => {
                  history.push('/trade/swap/')
                }}
              />
            </Col>

            <Col sm={12} md={6} lg={4}>
              <BoxButton
                title="OTC"
                description="Private OTC Trade"
                icon={<IconGroup size="large" />}
                onClick={() => {
                  history.push('/trade/otc/')
                }}
              />
            </Col>

            <Col sm={12} md={6} lg={4}>
              <BoxButton
                title="Orderbook"
                description="Advanced trading venue"
                icon={<IconCopy size="large" />}
                onClick={() => {
                  history.push('/trade/orderbook/')
                }}
              />
            </Col>
            <div style={{ width: '30%', marginLeft: '3%' }}></div>
          </Row>
        </>
      )}
    </Container>
  )
}

export default TradePage
