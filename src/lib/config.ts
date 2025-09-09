import dotenv from 'dotenv'

dotenv.config()

export type Environment = {
  RPC_URL: string
  PRIVATE_KEY: string
  BASE_CHAIN_ID: number
  LOG_LEVEL: 'info' | 'debug' | 'error'
  WETH_ADDRESS: string
  ROUTER_V2_ADDRESS: string
}

export function loadEnvironment(): Environment {
  const {
    RPC_URL,
    PRIVATE_KEY,
    BASE_CHAIN_ID = '8453',
    LOG_LEVEL = 'info',
    WETH_ADDRESS = '0x4200000000000000000000000000000000000006',
    ROUTER_V2_ADDRESS = ''
  } = process.env

  if (!RPC_URL) throw new Error('RPC_URL is required')
  if (!PRIVATE_KEY) throw new Error('PRIVATE_KEY is required')
  if (!ROUTER_V2_ADDRESS) throw new Error('ROUTER_V2_ADDRESS is required (UniswapV2-like)')

  return {
    RPC_URL,
    PRIVATE_KEY,
    BASE_CHAIN_ID: Number(BASE_CHAIN_ID),
    LOG_LEVEL: LOG_LEVEL as Environment['LOG_LEVEL'],
    WETH_ADDRESS,
    ROUTER_V2_ADDRESS
  }
}
