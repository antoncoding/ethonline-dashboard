import React from 'react'

import { Button, IconConnect, IconPower, IdentityBadge } from '@aragon/ui'

import { checkAddressAndAddToStorage } from '../../utils/storage'
import { useConnectedWallet } from '../../contexts/wallet'
import { SupportedNetworks, networkIdToName } from '../../constants'

function ConnectButton() {
  const { networkId, connect, disconnect, user } = useConnectedWallet()

  let color = '#26EF4B'
  switch (networkId) {
    case SupportedNetworks.Ropsten: {
      color = '#ff4a8d'
      break
    }
    case SupportedNetworks.Kovan: {
      color = '#8F7FFE'
      break
    }
    case SupportedNetworks.Arbitrum: {
      color = 'rgb(3, 173, 252, 1)'
      break
    }
  }
  const connectWeb3 = async () => {
    const address = await connect()
    if (!address) return
    checkAddressAndAddToStorage(address)
  }

  return user !== '' ? (
    <div>
      <div>
        <IdentityBadge
          entity={user}
          popoverAction={{
            label: (
              <>
                <IconPower></IconPower> Disconnect{' '}
              </>
            ),
            onClick: disconnect,
          }}
        />
      </div>
      <div style={{ display: 'flex', paddingRight: 3 }}>
        <div style={{ color, fontSize: 11, marginLeft: 'auto' }}>
          <div
            style={{
              verticalAlign: 'middle',
              paddingTop: 3,
              marginRight: '7px',
              display: 'inline-block',
              backgroundColor: color,
              borderRadius: '50%',
              width: '7px',
              height: '7px',
            }}
          />
          Connected to {networkIdToName[networkId]}
        </div>
      </div>
    </div>
  ) : (
    <Button mode="normal" icon={<IconConnect />} label="Connect" onClick={connectWeb3} />
  )
}

export default ConnectButton
