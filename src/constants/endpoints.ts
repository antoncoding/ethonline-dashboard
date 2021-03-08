import { SupportedNetworks } from './networks'

type graphEndPointType = {
  [key in SupportedNetworks]: string
}

const isPublic = process.env.REACT_APP_PUBLIC === 'true'

export const subgraph: graphEndPointType = {
  '1': isPublic
    ? 'https://api.thegraph.com/subgraphs/name/opynfinance/gamma-mainnet'
    : 'https://api.thegraph.com/subgraphs/name/opynfinance/playground',
  '42': isPublic
    ? 'https://api.thegraph.com/subgraphs/name/opynfinance/gamma-kovan'
    : 'https://api.thegraph.com/subgraphs/name/opynfinance/gamma-internal-kovan',
}

export const ZeroXEndpoint: { [key in SupportedNetworks]: { http: string; ws: string } } = {
  1: {
    http: 'https://api.0x.org/',
    ws: 'wss://api.0x.org/sra/v4',
  },
  42: {
    http: 'https://kovan.api.0x.org/',
    ws: 'wss://kovan.api.0x.org/sra/v4',
  },
}
