import React, { useState } from 'react'
import { Row, Col } from 'react-grid-system'
import BigNumber from 'bignumber.js'
import { OTokenBalance, SubgraphOToken } from '../../../types'

import SectionHeader from '../../../components/SectionHeader'

import OTokenAutoComplete from '../../../components/OTokenAutoComplete'
import MakeOrderDetail from './MakeOrderDetail'

type MakeOrderProps = {
  oTokenBalances: OTokenBalance[] | null
  paymentTokenBalance: BigNumber
  allOtokens: SubgraphOToken[]
}

export default function MakeOrder({ oTokenBalances, paymentTokenBalance, allOtokens }: MakeOrderProps) {
  const [selectedOToken, setSelectedOToken] = useState<null | SubgraphOToken>(null)

  const oTokenBalance = selectedOToken
    ? oTokenBalances?.find(b => b.token.id === selectedOToken.id)?.balance || new BigNumber(0)
    : new BigNumber(0)

  return (
    <>
      <SectionHeader title="Select oToken" />
      <Row>
        <Col xl={3} lg={4} md={6} sm={12}>
          <OTokenAutoComplete
            oTokens={allOtokens}
            selectedOToken={selectedOToken}
            setSelectedOToken={setSelectedOToken}
          />
        </Col>
      </Row>
      {selectedOToken && (
        <MakeOrderDetail
          selectedOToken={selectedOToken}
          paymentTokenBalance={paymentTokenBalance}
          oTokenBalance={oTokenBalance}
        />
      )}
    </>
  )
}
