import type { AddressLike, Provider, Wallet } from 'ethers'

export type SnipeOperation =
  | { kind: 'fair_launch_buy', tokenAddress: string, maxEth: string, slippageBips: number }
  | { kind: 'post_launch_buy', tokenAddress: string, maxEth: string, slippageBips: number }

export type SniperContext = {
  wallet: Wallet
  provider: Provider
  logger: any
  dryRun: boolean
}

export type SellParams = {
  tokenAddress: string
  amountHuman: string
  slippageBips: number
}
