import React, { useState, useEffect, useMemo } from 'react'
import ReactGA from 'react-ga'
import { Col, Row, Container } from 'react-grid-system'
import { Button, DataView, TextInput, Tag } from '@aragon/ui'
import { useParams } from 'react-router-dom'

import { useConnectedWallet } from '../../../contexts/wallet'
import { useAuthorizedOperators } from '../../../hooks/useAuthorizedOperators'
import SectionTitle from '../../../components/SectionHeader'
import Header from '../../../components/Header'
import CustomIdentityBadge from '../../../components/CustomIdentityBadge'
import Comment from '../../../components/Comment'
import StyledContainer from '../../../components/StyledContainer'

import { knownOperators } from '../../../constants/addresses'
import { OPERATORS } from '../../../constants/dataviewContents'

import { useController } from '../../../hooks/useController'

import { SupportedNetworks } from '../../../constants'

export default function OperatorSection() {
  const { account } = useParams()

  useEffect(() => {
    ReactGA.pageview('/account/operators/')
  }, [])

  const { networkId, user } = useConnectedWallet()

  const { operators, isLoading } = useAuthorizedOperators(user)

  const recommendedOperators = useMemo(
    () => knownOperators[networkId].filter(o => !operators.find(added => added.address === o.address.toLowerCase())),
    [networkId, operators],
  )

  const [newOperatorAddr, setNewOperatorAddr] = useState('')

  const controller = useController()

  async function revokeOperator(operator) {
    await controller.updateOperator(operator, false)
  }

  async function addCustomOperator(address: string) {
    await controller.updateOperator(address, true)
  }

  return (
    <StyledContainer>
      <Header primary="Operators" />
      Operators are addresses which can manipulate your vaults on your behalf.
      {operators.length > 0 && (
        <>
          <SectionTitle title="Authorized Operators" />
          <DataView
            status={isLoading ? 'loading' : 'default'}
            fields={['label', 'description', 'author', 'tag', 'action']}
            emptyState={OPERATORS}
            entries={operators}
            renderEntry={({ address, isEOA }) => {
              const info = getOperatorDetail(address, networkId, isEOA)
              return [
                <CustomIdentityBadge shorten={false} entity={address} label={info.label} />,
                <Comment text={info.description} padding={0} />,
                info.author,
                <Tag color={info.tagColor} background={info.tagBackground}>
                  {' '}
                  {info.tagText}{' '}
                </Tag>,
                <Button label="revoke" onClick={() => revokeOperator(address)} />,
              ]
            }}
          />
        </>
      )}
      {recommendedOperators.length > 0 && (
        <>
          <SectionTitle title="Recommended Operators" />
          <DataView
            status={isLoading ? 'loading' : 'default'}
            fields={['contract name', 'description', 'author', 'tag', '']}
            entries={recommendedOperators}
            renderEntry={operator => {
              const info = getOperatorDetail(operator.address, networkId, false)
              return [
                <CustomIdentityBadge shorten={false} entity={operator.address} label={info.label} />,
                <Comment text={info.description} padding={0} />,
                info.author,
                <Tag color={info.tagColor} background={info.tagBackground}>
                  {' '}
                  {info.tagText}{' '}
                </Tag>,
                <Button mode="strong" label="Add" onClick={() => addCustomOperator(operator.address)} />,
              ]
            }}
          />
        </>
      )}
      {/* Add operator */}
      <Container style={{ padding: 0 }}>
        <SectionTitle title="Add Custom Operator" />

        <Row>
          <Col xs={12} md={6} lg={5}>
            <TextInput
              type="text"
              wide
              value={newOperatorAddr}
              onChange={e => {
                setNewOperatorAddr(e.target.value)
              }}
              readOnly={user !== account}
            />
          </Col>
          <Col xs={12} md={6} lg={3}>
            <Button label="Add" onClick={() => addCustomOperator(newOperatorAddr)} disabled={account !== user} />
          </Col>
        </Row>
      </Container>
    </StyledContainer>
  )
}

function getOperatorDetail(address: string, networkId: SupportedNetworks, isEOA: boolean) {
  let tagText = 'beta'
  let tagColor = '#FFC300'
  let tagBackground = '#FFF8BC'
  let label = 'Unknown'
  let description = ''
  let author = 'Unknown'
  const operatorInfo = knownOperators[networkId].find(info => info.address.toLowerCase() === address.toLowerCase())
  if (operatorInfo) {
    label = operatorInfo.name
    author = operatorInfo.author
    description = operatorInfo.description
    if (operatorInfo.audited) {
      tagColor = '#006600'
      tagBackground = '#c2f0c2'
      tagText = 'audited'
    }
  } else if (isEOA) {
    tagColor = '#800000'
    tagBackground = '#ffb3b3'
    tagText = 'EOA'
    author = '-'
  }
  return {
    tagText,
    tagColor,
    tagBackground,
    label,
    description,
    author,
  }
}
