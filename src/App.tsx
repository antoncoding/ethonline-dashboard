import React, { useState } from 'react'
import ReactGA from 'react-ga'
import { Col, Row, setConfiguration } from 'react-grid-system'
import 'moment-timezone'

import { Main } from '@aragon/ui'
import { walletContext } from './contexts/wallet'
import { OrderbookProvider } from './contexts/orderbook'

import NavBar from './components/NavBar'
import SideBar from './components/SideBar'

import Factory from './pages/Protocol/Factory'
import Faucet from './pages/Protocol/Faucet'
import ProtocolHome from './pages/Protocol'
import Account from './pages/Account'
import AccountVault from './pages/Account/AccountVaults'
import ConnectWallet from './pages/Account/ConnectWallet'
import Vault from './pages/Account/VaultDetail'
import Oracle from './pages/Protocol/Oracle'
import OTokenList from './pages/Protocol/OTokenList/index'
import OToken from './pages/Protocol/OTokenList/otoken'
import Operators from './pages/Account/Operators'
import HomePage from './pages/HomePage'
import Settings from './pages/Settings'
import Trade from './pages/Trade'

import Orderbook from './pages/Trade/OrderBookTrade'
import Swap from './pages/Trade/Swap'
import OTC from './pages/Trade/OTC'
import RFQ from './pages/Trade/RFQ'

import { useConnection } from './hooks/useConnection'

import { getPreference } from './utils/storage'

import { HashRouter as Router, Switch, Route } from 'react-router-dom'

import { SHOW_SIDE_BAR } from './constants'

ReactGA.initialize(process.env.REACT_APP_GA_TRACKINK_ID || '')

function App() {
  const wallet = useConnection()
  const defaultTheme = getPreference('theme', 'light')
  const [theme, setTheme] = useState(defaultTheme)

  const [isSideBarOpen, setSideBarOpen] = useState(getPreference(SHOW_SIDE_BAR, 'true') === 'true')

  setConfiguration({ containerWidths: [540, 620, 760, 980, 1140] })

  return (
    <Router>
      <Main layout={false} theme={theme}>
        <walletContext.Provider value={wallet}>
          <OrderbookProvider>
            <NavBar isSideBarOpen={isSideBarOpen} setSideBarOpen={setSideBarOpen} />
            <Row style={{ height: '100%' }} nogutter>
              {isSideBarOpen && (
                <Col sm={12} md={2} lg={2} xl={2}>
                  <SideBar />
                </Col>
              )}
              <Col
                sm={12}
                md={isSideBarOpen ? 10 : 12}
                lg={isSideBarOpen ? 10 : 12}
                xl={isSideBarOpen ? 10 : 12}
                // offset={maincontentOffset}
              >
                <Switch>
                  <Route path="/trade/orderbook">
                    <Row nogutter>
                      <Col sm={12} md={10} offset={{ md: 1 }}>
                        <Orderbook />
                      </Col>
                    </Row>
                  </Route>
                  <Route path="/trade/swap/:otoken">
                    <Swap />
                  </Route>
                  <Route path="/trade/swap/">
                    <Swap />
                  </Route>
                  <Route path="/trade/rfq/:otoken">
                    <Layout>
                      <RFQ />
                    </Layout>
                  </Route>
                  <Route path="/trade/rfq/">
                    <Layout>
                      <RFQ />
                    </Layout>
                  </Route>
                  <Route path="/trade/otc/">
                    <OTC />
                  </Route>
                  <Route path="/trade/">
                    <Trade />
                  </Route>

                  <Route path="/account/:account/operators">
                    <Operators />
                  </Route>
                  <Route path="/account/:account/vaults/">
                    <AccountVault />
                  </Route>
                  <Route path="/account/:account">
                    <Account />
                  </Route>
                  <Route path="/account/">
                    <ConnectWallet />
                  </Route>

                  <Route path="/vault/:owner/:vaultId">
                    <Vault />
                  </Route>
                  <Route path="/protocol/faucet">
                    <Faucet />
                  </Route>
                  <Route path="/protocol/oracle">
                    <Oracle />
                  </Route>

                  <Route path="/protocol/factory/">
                    <Factory />
                  </Route>
                  <Route path="/protocol/otokens/">
                    <OTokenList />
                  </Route>
                  <Route path="/protocol/">
                    <ProtocolHome />
                  </Route>

                  <Route path="/otoken/:otoken">
                    <OToken />
                  </Route>
                  <Route path="/settings/">
                    <Settings setTheme={setTheme} />
                  </Route>
                  <Route path="/">
                    <HomePage />
                  </Route>
                </Switch>
              </Col>
            </Row>
          </OrderbookProvider>
        </walletContext.Provider>
      </Main>
    </Router>
  )
}

export default App
