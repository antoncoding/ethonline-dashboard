import React, { useState } from 'react'
import { useHistory } from 'react-router-dom'
import { Visible } from 'react-grid-system'

import { useTheme, IconHome, IconUser, IconConfiguration, LinkBase, IconSwap, Tag } from '@aragon/ui'
import SidebarTitle from './SidebarTitle'
import SubButton from './SubButton'

import { useConnectedWallet } from '../../contexts/wallet'

const hash = process.env.REACT_APP_VERSION || '0x00'

export default function SideBar() {
  const theme = useTheme()
  const history = useHistory()

  history.listen(location => {
    setSelectedTab(locationToTabId(location))
    setSelectedSubButton(locationToSubButtomId(location))
  })

  const { user } = useConnectedWallet()

  const defaultSelectedTab = locationToTabId(history.location)

  const defaultSubTab = locationToSubButtomId(history.location)

  const [selectedTab, setSelectedTab] = useState(defaultSelectedTab)
  const [subSelected, setSelectedSubButton] = useState(defaultSubTab)

  return (
    <div
      style={{
        backgroundColor: theme.surface,
        height: '100%',
        width: '100%',
        borderRight: '1px solid',
        borderColor: theme.border,
      }}
    >
      <div style={{ paddingTop: '5%' }}>
        <SidebarTitle
          title="Home"
          icon={<IconHome />}
          onClick={() => {
            history.push('/')
            setSelectedTab(1)
          }}
          isSelected={selectedTab === 1}
        />
        <SidebarTitle
          title="Account"
          icon={<IconUser />}
          onClick={() => {
            history.push('/account/')
            setSelectedTab(2)
          }}
          isSelected={selectedTab === 2}
        />

        <SubButton
          title="Operators"
          onClick={() => {
            history.push(`/account/${user}/operators/`)
          }}
          isSelected={selectedTab === 2 && subSelected === 'operators'}
          shown={selectedTab === 2}
        />
        <SubButton
          title="Vaults"
          onClick={() => {
            history.push(`/account/${user}/vaults/`)
          }}
          isSelected={selectedTab === 2 && subSelected === 'vaults'}
          shown={selectedTab === 2}
        />

        <SidebarTitle
          title="Protocol"
          icon={<IconConfiguration />}
          onClick={() => {
            history.push('/protocol/')
          }}
          isSelected={selectedTab === 3}
        />

        <SubButton
          title="OTokens"
          onClick={() => {
            history.push(`/protocol/otokens/`)
          }}
          isSelected={selectedTab === 3 && subSelected === 'otokens'}
          shown={selectedTab === 3}
        />
        <SubButton
          title="Oracle"
          onClick={() => {
            history.push(`/protocol/oracle/`)
          }}
          isSelected={selectedTab === 3 && subSelected === 'oracle'}
          shown={selectedTab === 3}
        />
        <SubButton
          title="Factory"
          onClick={() => {
            history.push(`/protocol/factory/`)
          }}
          isSelected={selectedTab === 3 && subSelected === 'factory'}
          shown={selectedTab === 3}
        />
        <SubButton
          title="Faucet"
          onClick={() => {
            history.push(`/protocol/faucet/`)
          }}
          isSelected={selectedTab === 3 && subSelected === 'faucet'}
          shown={selectedTab === 3}
        />

        <SidebarTitle
          title="Trade"
          icon={<IconSwap />}
          onClick={() => {
            history.push('/trade/')
          }}
          isSelected={selectedTab === 4}
        />

        <SubButton
          title={
            <>
              RFQ <Tag> New </Tag>
            </>
          }
          onClick={() => {
            history.push(`/trade/rfq/`)
          }}
          isSelected={selectedTab === 4 && subSelected === 'rfq'}
          shown={selectedTab === 4}
        />
        <SubButton
          title="OTC"
          onClick={() => {
            history.push(`/trade/otc/`)
          }}
          isSelected={selectedTab === 4 && subSelected === 'otc'}
          shown={selectedTab === 4}
        />
        <SubButton
          title="Orderbook"
          onClick={() => {
            history.push(`/trade/orderbook/`)
          }}
          isSelected={selectedTab === 4 && subSelected === 'orderbook'}
          shown={selectedTab === 4}
        />
      </div>
      <Visible xl lg xxl md>
        <div
          style={{
            color: theme.contentSecondary,
            padding: '10px',
            position: 'fixed',
            bottom: '0px',
          }}
        >
          Commit Hash{' '}
          <LinkBase external href={`https://github.com/antoncoding/opyn-v2-portal/commit/${hash}`}>
            {' '}
            {hash}{' '}
          </LinkBase>
        </div>
      </Visible>
    </div>
  )
}

function locationToTabId(location) {
  return location.pathname === '/'
    ? 1
    : location.pathname.includes('/account/')
    ? 2
    : location.pathname.includes('/protocol/')
    ? 3
    : location.pathname.includes('/trade/')
    ? 4
    : -1
}

function locationToSubButtomId(location) {
  return location.pathname.includes('/operators/')
    ? 'operators'
    : location.pathname.includes('/vaults/')
    ? 'vaults'
    : location.pathname.includes('/factory/')
    ? 'factory'
    : location.pathname.includes('/faucet/')
    ? 'faucet'
    : location.pathname.includes('/oracle/')
    ? 'oracle'
    : location.pathname.includes('/otokens/')
    ? 'otokens'
    : location.pathname.includes('/rfq/')
    ? 'rfq'
    : location.pathname.includes('/orderbook/')
    ? 'orderbook'
    : location.pathname.includes('/otc/')
    ? 'otc'
    : ''
}
