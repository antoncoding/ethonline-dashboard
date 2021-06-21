import React from 'react'
import LabelText from '../LabelText'
import { LoadingRing } from '@aragon/ui'

type Props = {
  label: string
  amount: string | any
  symbol: string
  isLoading?: boolean
}
export default function TokenBalanceEntry({ label, amount, symbol, isLoading }: Props) {
  return (
    <div style={{ display: 'flex', paddingTop: '5px' }}>
      <LabelText label={label} minWidth={'150px'} />
      {isLoading ? (
        <LoadingRing />
      ) : (
        <>
          <div style={{ paddingRight: '5px' }}>{amount}</div>
          <div style={{ opacity: 0.7 }}>{symbol}</div>
        </>
      )}
    </div>
  )
}
