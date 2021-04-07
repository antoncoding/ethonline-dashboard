export enum SupportedNetworks {
  Mainnet = 1,
  Ropsten = 3,
  Kovan = 42,
  BSC = 56,
}

export const networkIdToTxUrl = {
  [SupportedNetworks.Mainnet]: 'https://etherscan.io/tx',
  [SupportedNetworks.Ropsten]: 'https://ropsten.etherscan.io/tx',
  [SupportedNetworks.Kovan]: 'https://kovan.etherscan.io/tx',
  [SupportedNetworks.BSC]: 'https://bscscan.com/tx',
}

export const networkIdToAddressUrl = {
  [SupportedNetworks.Mainnet]: 'https://etherscan.io/address',
  [SupportedNetworks.Kovan]: 'https://kovan.etherscan.io/address',
  [SupportedNetworks.BSC]: 'https://bscscan.com/address',
  [SupportedNetworks.Ropsten]: 'https://ropsten.etherscan.io/address',
}
