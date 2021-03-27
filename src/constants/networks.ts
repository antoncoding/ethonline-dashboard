const INFURA_KEY = process.env.REACT_APP_INFURA_KEY

export enum SupportedNetworks {
  Mainnet = 1,
  Ropsten = 3,
  Kovan = 42,
  Arbitrum = 212984383488152,
}

export const networkIdToTxUrl = {
  [SupportedNetworks.Mainnet]: 'https://etherscan.io/tx',
  [SupportedNetworks.Ropsten]: 'https://ropsten.etherscan.io/tx',
  [SupportedNetworks.Kovan]: 'https://kovan.etherscan.io/tx',
  [SupportedNetworks.Arbitrum]: 'https://explorer.arbitrum.io/#/tx',
}

export const networkIdToAddressUrl = {
  [SupportedNetworks.Mainnet]: 'https://etherscan.io/address',
  [SupportedNetworks.Ropsten]: 'https://ropsten.etherscan.io/address',
  [SupportedNetworks.Kovan]: 'https://kovan.etherscan.io/address',
  [SupportedNetworks.Arbitrum]: 'https://explorer.arbitrum.io/#/address',
}

export const networkIdToName = {
  [SupportedNetworks.Mainnet]: 'Mainnet',
  [SupportedNetworks.Ropsten]: 'Ropsten',
  [SupportedNetworks.Kovan]: 'Kovan',
  [SupportedNetworks.Arbitrum]: 'L2 (Arbitrum)',
}

export const networkIdToProvider = {
  [SupportedNetworks.Mainnet]: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
  [SupportedNetworks.Ropsten]: `https://ropsten.infura.io/v3/${INFURA_KEY}`,
  [SupportedNetworks.Kovan]: `https://kovan.infura.io/v3/${INFURA_KEY}`,
  [SupportedNetworks.Arbitrum]: 'https://kovan4.arbitrum.io/rpc',
}
