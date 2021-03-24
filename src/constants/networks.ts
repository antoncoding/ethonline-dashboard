export enum SupportedNetworks {
  Mainnet = 1,
  Ropsten = 3,
  Kovan = 42,
  Arbitrum = 212984383488152,
}

export const networkIdToTxUrl = {
  '1': 'https://etherscan.io/tx',
  '3': 'https://ropsten.etherscan.io/tx',
  '42': 'https://kovan.etherscan.io/tx',
  '212984383488152': 'https://explorer.arbitrum.io/#/tx',
}

export const networkIdToAddressUrl = {
  '1': 'https://etherscan.io/address',
  '3': 'https://ropsten.etherscan.io/address',
  '42': 'https://kovan.etherscan.io/address',
  '212984383488152': 'https://explorer.arbitrum.io/#/address',
}
