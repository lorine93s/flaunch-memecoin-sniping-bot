import { Command } from 'commander'
import { loadEnvironment } from './lib/config.js'
import { createLogger } from './lib/logger.js'
import { createWalletAndProvider } from './lib/provider.js'
import { FlaunchWatcher } from './sniper/FlaunchWatcher.js'
import { Sniper } from './sniper/Sniper.js'

const program = new Command()

program
  .name('flaunch-sniper')
  .description('Flaunch (Base) memecoin sniping bot')
  .version('0.1.0')

program
  .command('run')
  .description('Run the sniper')
  .option('-c, --config <path>', 'Path to JSON config', 'config.example.json')
  .option('--dry-run', 'Simulate without sending transactions', false)
  .action(async (opts) => {
    const env = loadEnvironment()
    const logger = createLogger(env.LOG_LEVEL)
    const { wallet, provider } = createWalletAndProvider(env)

    const sniper = new Sniper({ wallet, provider, logger, dryRun: opts.dryRun })
    const watcher = new FlaunchWatcher({ provider, logger, configPath: opts.config })

    logger.info('Starting Flaunch watcher...')
    await watcher.start(async (op) => {
      try {
        if (op.kind === 'fair_launch_buy') {
          await sniper.buyDuringFairLaunch(op)
        } else if (op.kind === 'post_launch_buy') {
          await sniper.buyAfterLaunch(op)
        }
      } catch (err) {
        logger.error({ err }, 'snipe error')
      }
    })
  })

program
  .command('sell')
  .description('Sell/exit position using router')
  .requiredOption('--token <address>', 'Token address')
  .option('--amount <amount>', 'Amount of tokens (human units)', 'ALL')
  .option('--slippage <bips>', 'Slippage in basis points', '300')
  .action(async (opts) => {
    const env = loadEnvironment()
    const logger = createLogger(env.LOG_LEVEL)
    const { wallet, provider } = createWalletAndProvider(env)

    const sniper = new Sniper({ wallet, provider, logger, dryRun: false })
    await sniper.sellViaRouter({
      tokenAddress: opts.token,
      amountHuman: opts.amount,
      slippageBips: Number(opts.slippage)
    })
  })

await program.parseAsync(process.argv)
