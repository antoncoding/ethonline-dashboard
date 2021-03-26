import React from 'react'

import { Button, IconConnect, Box, IconPower, IdentityBadge } from '@aragon/ui'

import { checkAddressAndAddToStorage } from '../../utils/storage'
import { useConnectedWallet } from '../../contexts/wallet'
import { SupportedNetworks } from '../../constants'

function ConnectButton() {
  const { networkId, connect, disconnect, user } = useConnectedWallet()

  let color = 'rgb(3, 135, 137, 0.7)'
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
    <>
      <Box padding={6}>
        <div
          style={{
            verticalAlign: 'middle',
            marginRight: '7px',
            display: 'inline-block',
            backgroundColor: color,
            borderRadius: '50%',
            width: '10px',
            height: '10px',
          }}
        />
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
      </Box>
    </>
  ) : (
    <Button mode="normal" icon={<IconConnect />} label="Connect" onClick={connectWeb3} />
  )
}

export default ConnectButton
