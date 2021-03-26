import { SupportedNetworks } from './networks'

type graphEndPointType = {
  [key in SupportedNetworks]: string
}

const isPublic = process.env.REACT_APP_PUBLIC === 'true'

export const subgraph: graphEndPointType = {
  [SupportedNetworks.Mainnet]: isPublic
    ? 'https://api.thegraph.com/subgraphs/name/opynfinance/gamma-mainnet'
    : 'https://api.thegraph.com/subgraphs/name/opynfinance/playground',
  [SupportedNetworks.Ropsten]: 'https://api.thegraph.com/subgraphs/name/opynfinance/gamma-ropsten',
  [SupportedNetworks.Kovan]: isPublic
    ? 'https://api.thegraph.com/subgraphs/name/opynfinance/gamma-kovan'
    : 'https://api.thegraph.com/subgraphs/name/opynfinance/gamma-internal-kovan',
  [SupportedNetworks.Arbitrum]: 'http://localhost:8000',
}

export const ZeroXEndpoint: { [key in SupportedNetworks]: { http: string; ws: string } } = {
  [SupportedNetworks.Mainnet]: {
    http: 'https://api.0x.org/',
    ws: 'wss://api.0x.org/sra/v4',
  },
  [SupportedNetworks.Ropsten]: {
    http: 'https://ropsten.api.0x.org/',
    ws: 'wss://ropsten.api.0x.org/sra/v4',
  },
  [SupportedNetworks.Kovan]: {
    http: 'https://kovan.api.0x.org/',
    ws: 'wss://kovan.api.0x.org/sra/v4',
  },
  [SupportedNetworks.Arbitrum]: {
    http: 'https://kovan.api.0x.org/',
    ws: 'wss://kovan.api.0x.org/sra/v3',
  },
}
