# Flaunch Memecoin Sniping Bot (Base)

Autonomous, configurable sniping bot for the Flaunch fair-launch platform on Base. It watches for fair-launch and post-launch events and executes buys via a UniswapV2-compatible router. Includes a CLI for running, dry-run simulation, and exiting positions.

## Features
- 30-min fixed-price fair-launch sniping flow
- Post-launch buy with slippage control
- Router-based sell/exit (supports fee-on-transfer)
- Configurable watch targets and on-chain event subscription
- Structured logging (pretty in dev)
- TypeScript, ESM, ethers v6

## Flaunch (Overview)
- **Domain**: `flaunch.gg`
- **Chain**: Base
- **Trading Fee**: 1% (adjustable by creators)
- **Fair Launch**: 30-minute fixed-price window; all participants buy/sell at same price once the window ends
- **Automated Buybacks**: Triggered on fee accrual (e.g., 0.1 ETH blocks), can stack with demand
- **Rev Share**: Creator configurable split; remainder feeds buybacks
- **Tokenized Memestream**: NFT representing fee rights; transferable for community/market dynamics

This bot focuses on fast entry to fair launches and controlled exits using router liquidity.

## Quick Start

### Prerequisites
- Node.js >= 18.17
- A Base RPC URL and funded wallet private key
- UniswapV2-like router address on Base (e.g., your preferred DEX)

### Install
```bash
npm install
```

### Configure
Copy `env.example` to `.env` and fill values:
```ini
RPC_URL=
PRIVATE_KEY=
BASE_CHAIN_ID=8453
WETH_ADDRESS=0x4200000000000000000000000000000000000006
ROUTER_V2_ADDRESS=
LOG_LEVEL=info
```

Edit `config.example.json` (copy to `config.json`) to set targets or on-chain subscriptions:
```json
{
  "launchpadAddress": "0x...",           // flaunch launchpad (optional)
  "fairLaunchTopic": "0x...",            // keccak topic for FairLaunch (optional)
  "postLaunchTopic": "0x...",            // keccak topic for PostLaunch (optional)
  "targets": [                            // static targets (immediate buy)
    { "token": "0xToken", "maxEth": "0.02", "slippageBips": 800 }
  ],
  "blacklist": []
}
```

### Develop
```bash
npm run dev -- run -c config.json --dry-run
```

### Build & Run
```bash
npm run build
node dist/index.js run -c config.json
```

### CLI
- `run` — start the watcher and execute buys
  - `-c, --config <path>`: path to JSON config (default `config.example.json`)
  - `--dry-run`: simulate without sending transactions
- `sell` — exit position via router swap
  - `--token <address>`: token to sell
  - `--amount <amount>`: amount in human units or `ALL`
  - `--slippage <bips>`: default 300 (3%)

Examples:
```bash
# Dry run
npm run dev -- run -c config.json --dry-run

# Live run
node dist/index.js run -c config.json

# Sell all tokens with 5% slippage
node dist/index.js sell --token 0xToken --amount ALL --slippage 500
```

## Strategy Notes
- For fair launches, configure `targets` for known tokens or subscribe to the launchpad address/topics when available.
- Use conservative `slippageBips` during high contention periods. 300–800 bips is common; adjust to your risk.
- The bot estimates `amountOutMin` via `getAmountsOut` and applies slippage; ensure router path WETH→TOKEN is liquid.

## Security
- Never commit your `.env`.
- Use a dedicated hot wallet with limited funds.
- Validate router and token addresses.
- Understand risks of MEV, volatile launches, fee-on-transfer tokens, and rug pulls.

## Disclaimer
This software is provided as-is, without warranty. You are solely responsible for its use and any financial losses.

## Suggested GitHub Topics
`base`, `memecoin`, `trading-bot`, `sniper-bot`, `defi`, `ethers`, `typescript`, `uniswap`, `dex`, `launchpad`, `flaunch`

## License
MIT