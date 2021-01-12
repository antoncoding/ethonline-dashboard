import { SupportedNetworks } from './networks'

type graphEndPointType = {
  [key in SupportedNetworks]: string
}

export const subgraph: graphEndPointType = {
  '1': 'https://api.thegraph.com/subgraphs/name/opynfinance/playground',
  '42': 'https://api.thegraph.com/subgraphs/name/opynfinance/gamma-kovan',
}

export const ZeroXEndpoint: { [key in SupportedNetworks]: { http: string; ws: string } } = {
  1: {
    http: 'https://opyn.api.0x.org/',
    ws: 'wss://api.0x.org/sra/v3',
  },
  42: {
    http: 'https://kovan.api.0x.org/',
    ws: 'wss://kovan.api.0x.org/sra/v3',
  },
}
