import { SupportedNetworks } from './networks'

type graphEndPointType = {
  [key in SupportedNetworks]: string
}

const isPublic = process.env.REACT_APP_PUBLIC === 'true'

export const subgraph: graphEndPointType = {
  [SupportedNetworks.Mainnet]: isPublic
    ? 'https://api.thegraph.com/subgraphs/name/opynfinance/gamma-mainnet'
    : 'https://api.thegraph.com/subgraphs/name/opynfinance/playground',
  [SupportedNetworks.Kovan]: isPublic
    ? 'https://api.thegraph.com/subgraphs/name/opynfinance/gamma-kovan'
    : 'https://api.thegraph.com/subgraphs/name/opynfinance/gamma-internal-kovan',
  [SupportedNetworks.Ropsten]: 'https://api.thegraph.com/subgraphs/name/opynfinance/gamma-ropsten',
}

export const rfqServer: graphEndPointType = {
  [SupportedNetworks.Mainnet]: 'https://quoter-testnet-jt76tpqb5q-uc.a.run.app/', // update this
  [SupportedNetworks.Kovan]: 'https://quoter-testnet-jt76tpqb5q-uc.a.run.app/', // update this
  [SupportedNetworks.Ropsten]: 'https://quoter-testnet-jt76tpqb5q-uc.a.run.app/',
}

export const ZeroXEndpoint: { [key in SupportedNetworks]: { http: string; ws: string } } = {
  1: {
    http: 'https://api.0x.org/',
    ws: 'wss://api.0x.org/sra/v4',
  },
  3: {
    http: 'https://ropsten.api.0x.org/',
    ws: 'wss://ropsten.api.0x.org/sra/v4',
  },
  42: {
    http: 'https://kovan.api.0x.org/',
    ws: 'wss://kovan.api.0x.org/sra/v4',
  },
}
