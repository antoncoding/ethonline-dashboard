import React, { useState, useMemo } from 'react'

import SectionTitle from '../../components/SectionHeader'

import { Switch, useToast, Help, IconUnlock, Button } from '@aragon/ui'
import { storePreference, getPreference } from '../../utils/storage'
import { useConnectedWallet } from '../../contexts/wallet'
import { useUserAllowance } from '../../hooks/useAllowance'
import { getWeth, Spenders, ZEROX_PROTOCOL_FEE_KEY, FeeTypes } from '../../constants'
import BigNumber from 'bignumber.js'

function ZeroXFee() {
  const mode = getPreference(ZEROX_PROTOCOL_FEE_KEY, FeeTypes.ETH)
  const toast = useToast()

  const { networkId } = useConnectedWallet()

  const weth = useMemo(() => getWeth(networkId), [networkId])

  const { allowance, approve } = useUserAllowance(weth.id, Spenders.ZeroXExchange)

  const [payWithWeth, SetPayWithWeth] = useState(mode === FeeTypes.WETH)

  return (
    <>
      <div style={{ display: 'flex' }}>
        <SectionTitle title="0x Protocol Fee" />
        <div style={{ paddingLeft: '10px', paddingTop: '25px' }}>
          <Help hint={'What is this'}>
            To fill a 0x order, you need to pay a protocol fee in either ETH or WETH. Paying in ETH will restrict you
            from increasing gas price in your wallet.
          </Help>
        </div>
      </div>

      <div style={{ display: 'flex' }}>
        <div style={{ paddingRight: 20 }}> Pay with WETH </div>
        <div style={{ paddingTop: 3, paddingRight: 20 }}>
          {' '}
          <Switch
            checked={payWithWeth}
            onChange={(checked: boolean) => {
              SetPayWithWeth(checked)
              const newMode = checked ? FeeTypes.WETH : FeeTypes.ETH
              storePreference(ZEROX_PROTOCOL_FEE_KEY, newMode)
              toast('0x fee preference updated')
            }}
          />{' '}
        </div>
        <div>
          {payWithWeth && allowance.isZero() && (
            <Button
              checked={payWithWeth}
              display="icon"
              icon={<IconUnlock />}
              size="mini"
              mode="negative"
              onClick={() => {
                approve(new BigNumber(0))
              }}
            />
          )}
        </div>
      </div>
    </>
  )
}

export default ZeroXFee
