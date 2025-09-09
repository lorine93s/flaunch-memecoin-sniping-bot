import { Contract, parseEther } from 'ethers'
import routerAbi from '../abis/routerV2.json' assert { type: 'json' }
import erc20Abi from '../abis/erc20.json' assert { type: 'json' }
import type { SellParams, SniperContext, SnipeOperation } from './types.js'
import { loadEnvironment } from '../lib/config.js'

export class Sniper {
  private readonly wallet: SniperContext['wallet']
  private readonly provider: SniperContext['provider']
  private readonly logger: any
  private readonly dryRun: boolean
  private readonly env = loadEnvironment()

  constructor(ctx: SniperContext) {
    this.wallet = ctx.wallet
    this.provider = ctx.provider
    this.logger = ctx.logger
    this.dryRun = ctx.dryRun
  }

  async buyDuringFairLaunch(op: Extract<SnipeOperation, { kind: 'fair_launch_buy' }>) {
    return this.buyCommon(op.tokenAddress, op.maxEth, op.slippageBips)
  }

  async buyAfterLaunch(op: Extract<SnipeOperation, { kind: 'post_launch_buy' }>) {
    return this.buyCommon(op.tokenAddress, op.maxEth, op.slippageBips)
  }

  private async buyCommon(tokenAddress: string, maxEth: string, slippageBips: number) {
    const router = new Contract(this.env.ROUTER_V2_ADDRESS, routerAbi, this.wallet)
    const path = [this.env.WETH_ADDRESS, tokenAddress]

    const deadline = Math.floor(Date.now() / 1000) + 60 * 3
    const value = parseEther(maxEth)

    // Estimate minimal out via getAmountsOut and apply slippage
    const amounts: bigint[] = await router.getAmountsOut(value, path)
    const expectedOut: bigint = amounts[amounts.length - 1]
    const amountOutMin = expectedOut - (expectedOut * BigInt(slippageBips)) / BigInt(10_000)

    this.logger.info({ tokenAddress, value: maxEth, amountOutMin: amountOutMin.toString() }, 'buy')

    if (this.dryRun) return { hash: 'dry-run' }

    const tx = await router.swapExactETHForTokens(amountOutMin, path, this.wallet.address, deadline, {
      value
    })
    this.logger.info({ hash: tx.hash }, 'buy sent')
    const receipt = await tx.wait()
    this.logger.info({ hash: tx.hash, status: receipt?.status }, 'buy confirmed')
    return receipt
  }

  async sellViaRouter(params: SellParams) {
    const router = new Contract(this.env.ROUTER_V2_ADDRESS, routerAbi, this.wallet)
    const token = new Contract(params.tokenAddress, erc20Abi, this.wallet)

    const decimals: number = await token.decimals()

    let amount: bigint
    if (params.amountHuman.toUpperCase() === 'ALL') {
      amount = await token.balanceOf(this.wallet.address)
    } else {
      // naive parse; for brevity, rely on parseEther when decimals==18
      if (decimals !== 18) throw new Error('Non-18 decimals not supported in quick sell; use ALL')
      amount = parseEther(params.amountHuman)
    }

    const allowance: bigint = await token.allowance(this.wallet.address, this.env.ROUTER_V2_ADDRESS)
    if (allowance < amount) {
      const txA = await token.approve(this.env.ROUTER_V2_ADDRESS, amount)
      await txA.wait()
      this.logger.info({ hash: txA.hash }, 'approved router')
    }

    const path = [params.tokenAddress, this.env.WETH_ADDRESS]
    const deadline = Math.floor(Date.now() / 1000) + 60 * 3

    // Estimate expected ETH out for minOut with slippage
    const amounts: bigint[] = await router.getAmountsOut(amount, path)
    const expectedOut: bigint = amounts[amounts.length - 1]
    const amountOutMin = expectedOut - (expectedOut * BigInt(params.slippageBips)) / BigInt(10_000)

    const tx = await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
      amount,
      amountOutMin,
      path,
      this.wallet.address,
      deadline
    )
    this.logger.info({ hash: tx.hash }, 'sell sent')
    const receipt = await tx.wait()
    this.logger.info({ hash: tx.hash, status: receipt?.status }, 'sell confirmed')
    return receipt
  }
}
