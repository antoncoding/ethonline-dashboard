import React, { useState, useEffect, useMemo, useCallback } from 'react'
import BigNumber from 'bignumber.js'
import {
  Header,
  TextInput,
  Button,
  DropDown,
  useToast,
  LoadingRing,
  AddressField,
  Help,
  SyncIndicator,
} from '@aragon/ui'
import LabelText from '../../../components/LabelText'
import Warning from '../../../components/Warning'
import { getNextFriday, fromTokenAmount } from '../../../utils/math'
import SectionTitle from '../../../components/SectionHeader'
import TokenAddress from '../../../components/TokenAddress'
import { ZERO_ADDR } from '../../../constants/addresses'
import WarningText from '../../../components/Warning'
import { useFactory } from '../../../hooks/useFactory'
import { useAllProducts } from '../../../hooks/useAllProducts'

export default function CreateOption() {
  const factory = useFactory()

  const toast = useToast()
  const [selectedProductIndex, setSelectedProductIndex] = useState(-1)

  const [strikePriceReadable, setStrikePriceReadable] = useState<BigNumber>(new BigNumber(500))
  const [expiryTimestamp, setExpiryTimestamp] = useState<BigNumber>(new BigNumber(getNextFriday()))
  const [hasExpiryWarning, setHasWarning] = useState<boolean>(false)
  const [expiryWarning, setExpiryWarning] = useState<string>('')

  const [isDuplicated, setIsDuplicated] = useState(false)
  const [isCreating, setIsCreating] = useState(Boolean)
  const [targetAddress, setTargetAddress] = useState(ZERO_ADDR)

  // const expiryDate = useMemo(() => {
  //   try {
  //     const date = new Date(expiryTimestamp.times(1000).toNumber()).toISOString().split('T')[0]
  //     return date
  //   } catch (error) {
  //     return ''
  //   }
  // }, [expiryTimestamp])

  const { allProducts } = useAllProducts()

  // make sure expiry to be UTC 0800
  useEffect(() => {
    if (expiryTimestamp.minus(28800).mod(86400).isGreaterThan(0)) {
      setHasWarning(true)
      setExpiryWarning('Expiry time need to be 08:00 AM UTC')
    } else {
      setHasWarning(false)
    }
  }, [expiryTimestamp])

  const strikePrice = useMemo(() => fromTokenAmount(new BigNumber(strikePriceReadable), 8), [strikePriceReadable])

  const createOToken = useCallback(async () => {
    if (selectedProductIndex === -1) {
      toast('Please select a product')
      return
    }
    const underlying = allProducts[selectedProductIndex].underlying
    const strike = allProducts[selectedProductIndex].strike
    const collateral = allProducts[selectedProductIndex].collateral
    const isPut = allProducts[selectedProductIndex].isPut
    setIsCreating(true)
    // check if the option has been created.
    try {
      await factory.createOToken(underlying.id, strike.id, collateral.id, strikePrice, expiryTimestamp, isPut)
    } catch (error) {
    } finally {
      setIsCreating(false)
    }
  }, [factory, allProducts, selectedProductIndex, expiryTimestamp, strikePrice, toast])

  const computeAddress = useCallback(
    async (idx, strikePrice, expiry) => {
      if (idx === -1) {
        return
      }
      const underlying = allProducts[idx].underlying
      const strike = allProducts[idx].strike
      const collateral = allProducts[idx].collateral
      const isPut = allProducts[idx].isPut
      // check if the option has been created.
      const targetAddress = await factory.getTargetOtokenAddress(
        underlying.id,
        strike.id,
        collateral.id,
        strikePrice,
        expiry,
        isPut,
      )
      setTargetAddress(targetAddress)
      const isCreated = await factory.isCreated(underlying.id, strike.id, collateral.id, strikePrice, expiry, isPut)
      setIsDuplicated(isCreated)
    },
    [allProducts, factory],
  )

  // recompute address when input changes
  useEffect(() => {
    computeAddress(selectedProductIndex, strikePrice, expiryTimestamp)
  }, [computeAddress, selectedProductIndex, strikePrice, expiryTimestamp])

  return (
    <>
      <SyncIndicator visible={allProducts.length === 0} children={'Syncing data... 🎄'} />
      <Header primary="oToken Factory" />
      <SectionTitle title="Create new oToken" />
      <DropDown
        disabled={allProducts.length === 0}
        placeholder={allProducts.length === 0 ? <LoadingRing /> : 'Select product'}
        items={allProducts ? allProducts.map(p => p.label) : []}
        selected={selectedProductIndex}
        onChange={setSelectedProductIndex}
      />
      <br />
      <br />
      <div style={{ display: 'flex', alignItems: 'center', paddingBottom: '3%' }}>
        <div style={{ width: '20%', marginRight: '5%' }}>
          <LabelText label="Underlying" />
          <TokenAddress
            token={allProducts[selectedProductIndex] ? allProducts[selectedProductIndex].underlying : null}
            nullLabel="N/A"
          />
        </div>

        <div style={{ width: '20%', marginRight: '5%' }}>
          <LabelText label="Strike" />
          <TokenAddress
            token={allProducts[selectedProductIndex] ? allProducts[selectedProductIndex].strike : null}
            nullLabel="N/A"
          />
        </div>

        <div style={{ width: '20%', marginRight: '5%' }}>
          <LabelText label="Collateral" />
          <TokenAddress
            token={allProducts[selectedProductIndex] ? allProducts[selectedProductIndex].collateral : null}
            nullLabel="N/A"
          />
        </div>

        <div style={{ width: '20%', marginRight: '5%' }}>
          <LabelText label="Type" />
          {allProducts[selectedProductIndex] ? (allProducts[selectedProductIndex].isPut ? 'Put' : 'Call') : 'Put'}{' '}
          Option
        </div>
      </div>
      <SectionTitle title="Details" />

      <div style={{ display: 'flex', alignItems: 'center', paddingBottom: '1%' }}>
        <div style={{ width: '20%' }}>
          <LabelText label="Strike Price" />
          <TextInput
            type="number"
            value={strikePriceReadable}
            onChange={e => setStrikePriceReadable(new BigNumber(e.target.value))}
            wide
          />
        </div>

        <div style={{ width: '20%', marginLeft: '5%' }}>
          <LabelText label="Expiry Timestamp" />
          <TextInput
            type="number"
            value={expiryTimestamp}
            onChange={e => {
              setExpiryTimestamp(new BigNumber(e.target.value))
            }}
            wide
          />
          <Warning text={expiryWarning} show={hasExpiryWarning} />
        </div>

        <div style={{ width: '20%', marginLeft: '5%' }}>
          <div style={{ display: 'flex' }}>
            {' '}
            <LabelText label="Create!" /> <WarningText text="This option has been created" show={isDuplicated} />{' '}
          </div>
          <Button wide disabled={isDuplicated || isCreating || hasExpiryWarning} onClick={createOToken}>
            {' '}
            {isCreating ? (
              <>
                {' '}
                <LoadingRing /> <span style={{ paddingLeft: '5px' }}>Createing </span>{' '}
              </>
            ) : (
              'Create'
            )}{' '}
          </Button>
        </div>

        <div style={{ width: '20%', marginLeft: '5%' }}>
          <div style={{ display: 'flex' }}>
            <LabelText label="Output" />
            <Help hint={'What is this output address'}>
              The address the new oToken will be created at. In Opyn V2, we use CREATE2 opcode to create new oToken
              contracts, so we can predict a contract address before actual deployments.
            </Help>
          </div>
          <AddressField address={targetAddress} />
        </div>
      </div>
    </>
  )
}