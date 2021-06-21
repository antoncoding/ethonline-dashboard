import React, { useState, useEffect } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import { Col, Row } from 'react-grid-system'
import ReactGA from 'react-ga'
import { SyncIndicator, Info } from '@aragon/ui'
import RFQ from './rfq'

import { TradeAction, SupportedNetworks } from '../../../constants'
import { useLiveOTokens } from '../../../hooks'
import { SubgraphOToken } from '../../../types'
import OTokenAutoComplete from '../../../components/OTokenAutoComplete'
import { useConnectedWallet } from '../../../contexts/wallet'
import { Header } from '../../../components/Header'

export default function RFQPanel() {
  useEffect(() => {
    ReactGA.pageview('trade/rfq/')
  }, [])

  const { networkId } = useConnectedWallet()

  const history = useHistory()

  const { otoken } = useParams()

  const { allOtokens, isLoading } = useLiveOTokens()

  const [selectedOToken, setSelectedOToken] = useState<null | SubgraphOToken>(null)

  useEffect(() => {
    const token = allOtokens.find(o => o.id === otoken)
    setSelectedOToken(token ? token : null)
  }, [allOtokens, otoken])

  useEffect(() => {
    if (selectedOToken) history.push(`/trade/rfq/${selectedOToken.id}`)
  }, [selectedOToken, history])

  const [action, setAction] = useState(TradeAction.Buy)

  return (
    <>
      <Header primary={'RFQ'} />
      {networkId !== SupportedNetworks.Ropsten ? (
        <Info mode="error"> RFQ is only supported on Ropsten testnet. </Info>
      ) : (
        <>
          <Row>
            <Col lg={4} md={6} sm={12}>
              <OTokenAutoComplete
                oTokens={allOtokens}
                selectedOToken={selectedOToken}
                setSelectedOToken={setSelectedOToken}
              />
            </Col>
          </Row>
          <br />
          <RFQ selectedOToken={selectedOToken} action={action} setAction={setAction} />
          <SyncIndicator visible={isLoading} children={'Fetching token data 🍕'} />
        </>
      )}
    </>
  )
}
