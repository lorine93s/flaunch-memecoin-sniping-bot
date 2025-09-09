import { JsonRpcProvider, Log } from 'ethers'
import fs from 'node:fs'
import path from 'node:path'
import type { SnipeOperation } from './types.js'

export type FlaunchWatcherConfig = {
  launchpadAddress?: string
  fairLaunchTopic?: string
  postLaunchTopic?: string
  targets?: Array<{ token: string, maxEth: string, slippageBips: number }>
  blacklist?: string[]
}

export class FlaunchWatcher {
  private readonly provider: JsonRpcProvider
  private readonly logger: any
  private readonly configPath: string
  private config!: FlaunchWatcherConfig

  constructor(args: { provider: JsonRpcProvider, logger: any, configPath: string }) {
    this.provider = args.provider
    this.logger = args.logger
    this.configPath = args.configPath
    this.loadConfig()
  }

  private loadConfig() {
    const resolved = path.resolve(process.cwd(), this.configPath)
    const raw = fs.readFileSync(resolved, 'utf-8')
    this.config = JSON.parse(raw)
  }

  async start(onOperation: (op: SnipeOperation) => Promise<void>) {
    // Strategy 1: static targets list (addresses to buy)
    if (this.config.targets && this.config.targets.length > 0) {
      for (const t of this.config.targets) {
        if (this.isBlacklisted(t.token)) continue
        const op: SnipeOperation = { kind: 'fair_launch_buy', tokenAddress: t.token, maxEth: t.maxEth, slippageBips: t.slippageBips }
        await onOperation(op)
      }
    }

    // Strategy 2: subscribe to launchpad events if provided
    if (this.config.launchpadAddress && (this.config.fairLaunchTopic || this.config.postLaunchTopic)) {
      const topics: (string | null)[] = [null]
      const filter = {
        address: this.config.launchpadAddress,
        topics
      }
      this.provider.on(filter, async (log: Log) => {
        try {
          if (this.config.fairLaunchTopic && log.topics[0]?.toLowerCase() === this.config.fairLaunchTopic.toLowerCase()) {
            const tokenAddress = `0x${log.topics[1].slice(26)}`
            if (this.isBlacklisted(tokenAddress)) return
            const maxEth = this.config.targets?.[0]?.maxEth ?? '0.02'
            const slippageBips = this.config.targets?.[0]?.slippageBips ?? 1000
            await onOperation({ kind: 'fair_launch_buy', tokenAddress, maxEth, slippageBips })
          }
          if (this.config.postLaunchTopic && log.topics[0]?.toLowerCase() === this.config.postLaunchTopic.toLowerCase()) {
            const tokenAddress = `0x${log.topics[1].slice(26)}`
            if (this.isBlacklisted(tokenAddress)) return
            const maxEth = this.config.targets?.[0]?.maxEth ?? '0.02'
            const slippageBips = this.config.targets?.[0]?.slippageBips ?? 1000
            await onOperation({ kind: 'post_launch_buy', tokenAddress, maxEth, slippageBips })
          }
        } catch (err) {
          this.logger.error({ err }, 'watcher error')
        }
      })
      this.logger.info('Subscribed to Flaunch launchpad logs')
    } else {
      this.logger.warn('No launchpadAddress/topics configured; running only static targets')
    }
  }

  private isBlacklisted(addr: string) {
    return (this.config.blacklist ?? []).some(a => a.toLowerCase() === addr.toLowerCase())
  }
}
