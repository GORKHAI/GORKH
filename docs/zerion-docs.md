> ## Documentation Index
> Fetch the complete documentation index at: https://developers.zerion.io/llms.txt
> Use this file to discover all available pages before exploring further.

# Quickstart

> Get your API key and make your first request in under 5 minutes.

## Popular quickstarts

<Tabs>
  <Tab title="Wallet Data">
    <CardGroup cols={2}>
      <Card title="Get a wallet portfolio" icon="chart-pie" href="/api-reference/wallets/get-wallet-portfolio">
        Total value, position breakdown, and daily changes for any address.
      </Card>

      <Card title="List fungible positions" icon="coins" href="/api-reference/wallets/get-wallet-fungible-positions">
        Every token a wallet holds with quantities and USD values.
      </Card>

      <Card title="View DeFi positions" icon="layer-group" href="/recipes/defi-positions">
        Lending, staking, and liquidity positions across protocols.
      </Card>

      <Card title="NFT positions" icon="image" href="/api-reference/wallets/get-wallet-nft-positions">
        NFT holdings with metadata, floor prices, and collection info.
      </Card>
    </CardGroup>
  </Tab>

  <Tab title="Transactions">
    <CardGroup cols={2}>
      <Card title="Get parsed transactions" icon="clock-rotate-left" href="/api-reference/wallets/get-wallet-transactions">
        Human-readable transaction history with filters by type, chain, and date.
      </Card>

      <Card title="Subscribe to webhooks" icon="bell" href="/api-reference/subscriptions-to-transactions/create-subscription">
        Instant notifications when wallet transactions occur — no polling.
      </Card>
    </CardGroup>
  </Tab>

  <Tab title="Market Data">
    <CardGroup cols={2}>
      <Card title="Search fungible tokens" icon="magnifying-glass" href="/api-reference/fungibles/get-list-of-fungible-assets">
        Look up any token by name, get prices, charts, and market data.
      </Card>

      <Card title="Token charts" icon="chart-line" href="/api-reference/fungibles/get-a-chart-for-a-fungible-asset">
        Historical price and market cap charts for any token.
      </Card>
    </CardGroup>
  </Tab>

  <Tab title="Trading">
    <CardGroup cols={2}>
      <Card title="Get swap quotes" icon="arrow-right-arrow-left" href="/api-reference/swap/get-available-swap-offers">
        Fetch the best swap and bridge offers across chains.
      </Card>

      <Card title="Check gas prices" icon="gas-pump" href="/api-reference/gas/get-list-of-all-available-gas-prices">
        Current gas prices across all supported chains.
      </Card>
    </CardGroup>
  </Tab>
</Tabs>

***

## Make your first request

<Steps>
  <Step title="Get your API key">
    Sign up at [dashboard.zerion.io](https://dashboard.zerion.io) and create an API key from the dashboard. It's free to start.
  </Step>

  <Step title="Try it from the docs">
    The fastest way to test the API is right here in the docs. Open any [API reference](/api-reference/wallets/get-wallet-portfolio) page, click **Try it**, enter your API key in the **Username** field, leave **Password** empty, and hit **Send**.
  </Step>

  <Step title="Make a request from your code">
    The API uses [HTTP Basic Auth](/authentication) — your API key is the username, password is empty. Let's fetch a wallet portfolio:

    <CodeGroup>
      ```bash cURL theme={null}
      # Transform your API key for Basic Auth
      API_KEY_TRANSFORMED=$(echo -n "YOUR_API_KEY:" | base64)

      # Make the request
      curl -X GET "https://api.zerion.io/v1/wallets/0x42b9df65b219b3dd36ff330a4dd8f327a6ada990/portfolio" \
        -H "Authorization: Basic $API_KEY_TRANSFORMED" \
        -H "accept: application/json"
      ```

      ```javascript JavaScript theme={null}
      // Transform your API key for Basic Auth
      const apiKey = 'YOUR_API_KEY';
      const apiKeyTransformed = btoa(apiKey + ':');

      // Make the request
      const response = await fetch(
        'https://api.zerion.io/v1/wallets/0x42b9df65b219b3dd36ff330a4dd8f327a6ada990/portfolio',
        {
          headers: {
            'Authorization': `Basic ${apiKeyTransformed}`,
            'accept': 'application/json'
          }
        }
      );
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      console.log(data);
      ```

      ```python Python theme={null}
      import requests
      import base64

      # Transform your API key for Basic Auth
      api_key = 'YOUR_API_KEY'
      api_key_transformed = base64.b64encode(f'{api_key}:'.encode()).decode()

      # Make the request
      response = requests.get(
          'https://api.zerion.io/v1/wallets/0x42b9df65b219b3dd36ff330a4dd8f327a6ada990/portfolio',
          headers={
              'Authorization': f'Basic {api_key_transformed}',
              'accept': 'application/json'
          }
      )
      response.raise_for_status()
      data = response.json()
      print(data)
      ```

      ```go Go theme={null}
      import (
          "encoding/base64"
          "log"
          "net/http"
      )

      // Transform your API key for Basic Auth
      apiKey := "YOUR_API_KEY"
      apiKeyTransformed := base64.StdEncoding.EncodeToString([]byte(apiKey + ":"))

      // Make the request
      client := &http.Client{}
      req, err := http.NewRequest("GET", "https://api.zerion.io/v1/wallets/0x42b9df65b219b3dd36ff330a4dd8f327a6ada990/portfolio", nil)
      if err != nil {
          log.Fatal(err)
      }
      req.Header.Set("Authorization", "Basic " + apiKeyTransformed)
      req.Header.Set("accept", "application/json")

      resp, err := client.Do(req)
      if err != nil {
          log.Fatal(err)
      }
      defer resp.Body.Close()
      ```
    </CodeGroup>
  </Step>

  <Step title="Understand the response">
    The API returns data in [JSON:API](https://jsonapi.org/) format. Every response has a `data` object with `type`, `id`, and `attributes`:

    ```json theme={null}
    {
      "data": {
        "type": "portfolios",
        "id": "0x42b9df65b219b3dd36ff330a4dd8f327a6ada990",
        "attributes": {
          "positions_distribution_by_type": {
            "wallet": 0.85,
            "deposited": 0.10,
            "staked": 0.04,
            "locked": 0.01
          },
          "total": { "positions": 142 },
          "changes": {
            "absolute_1d": 1250.50,
            "percent_1d": 0.02
          }
        }
      }
    }
    ```

    List endpoints return a `data` array and support [pagination](/pagination-and-filtering).
  </Step>
</Steps>

## Next steps

<CardGroup cols={2}>
  <Card title="Authentication" icon="lock" href="/authentication">
    API key encoding and security best practices.
  </Card>

  <Card title="Pagination & Filtering" icon="filter" href="/pagination-and-filtering">
    Cursor pagination, filters, sorting, and currency options.
  </Card>

  <Card title="Recipes" icon="book" href="/recipes">
    Step-by-step guides for common use cases.
  </Card>

  <Card title="Rate Limits" icon="gauge" href="/rate-limits">
    Plan quotas, retry guidance, and usage headers.
  </Card>

  <Card title="Supported Blockchains" icon="link" href="/supported-blockchains">
    Full list of supported chains and feature coverage.
  </Card>
</CardGroup>


> ## Documentation Index
> Fetch the complete documentation index at: https://developers.zerion.io/llms.txt
> Use this file to discover all available pages before exploring further.

# Skill + CLI

> CLI for Zerion Wallet — analyze wallets, sign, swap, and bridge on-chain with agent-managed wallets across EVM chains and Solana, all from the command line. Plus agent skills that ship across every major AI coding agent.

The Zerion CLI is an open-source tool that wraps the Zerion API and a local encrypted wallet vault. The same binary powers both humans and AI agents — any agent that can run shell commands can analyze wallets, sign messages, and execute swaps without writing API integration code. Wallet management is built on the [Open Wallet Standard](https://github.com/open-wallet-standard/core).

Six agent skills ship alongside the CLI for AI coding agents (Claude Code, Cursor, Windsurf, Codex, Gemini, OpenCode, and any [agentskills.io](https://agentskills.io) host).

**Repository:** [github.com/zeriontech/zerion-ai](https://github.com/zeriontech/zerion-ai) — CLI and skills ship from the same repo.

<Note>
  **Alpha Preview** — The CLI is under active development. Commands, flags, and output formats may change between releases. Don't depend on current behavior in production workflows.
</Note>

## Installation

One-shot setup — installs the CLI globally, configures your API key, and adds skills across all detected coding agents:

```bash theme={null}
npx -y zerion-cli init -y --browser
```

* `-y` runs setup non-interactively
* `--browser` opens [dashboard.zerion.io](https://dashboard.zerion.io) so you can grab an API key and paste it back
* Skills install globally to every detected AI coding agent

Or install the CLI binary on its own:

```bash theme={null}
npm install -g zerion-cli
```

Requires Node.js 20 or later.

## Authentication

Three options. The CLI auto-detects which is active.

### API key (recommended)

Get a free key at [dashboard.zerion.io](https://dashboard.zerion.io). Keys begin with `zk_`.

```bash theme={null}
export ZERION_API_KEY="zk_..."
```

Or persist it via config:

```bash theme={null}
zerion config set apiKey zk_...
```

Required for analysis and trading. Analysis can also use x402 / MPP pay-per-call.

### x402 pay-per-call

No API key needed. Pays \$0.01 USDC per request via the [x402 protocol](https://www.x402.org/). Supports EVM (Base) and Solana.

```bash theme={null}
export WALLET_PRIVATE_KEY="0x..."     # EVM (Base) — 0x-prefixed hex
export WALLET_PRIVATE_KEY="5C1y..."   # Solana — base58 keypair

zerion analyze 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 --x402
```

Enable globally:

```bash theme={null}
export ZERION_X402=true
```

Both chains simultaneously:

```bash theme={null}
export EVM_PRIVATE_KEY="0x..."
export SOLANA_PRIVATE_KEY="5C1y..."
export ZERION_X402_PREFER_SOLANA=true
```

<Note>
  Pay-per-call applies to analytics commands only (`portfolio`, `positions`, `history`, `pnl`, `analyze`). Trading commands always use an API key.
</Note>

### MPP pay-per-call

No API key needed. Pays \$0.01 USDC per request via the [MPP protocol](https://mpp.dev) on [Tempo](https://tempo.xyz). EVM only.

```bash theme={null}
export WALLET_PRIVATE_KEY="0x..."     # or a dedicated key:
export TEMPO_PRIVATE_KEY="0x..."

zerion portfolio 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 --mpp
```

Enable globally:

```bash theme={null}
export ZERION_MPP=true
```

## Skills

The CLI ships with six agent skills that install into AI coding agents. Each skill is self-contained — your agent loads the relevant one based on the user's intent.

| Skill                     | What it does                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| `zerion`                  | Umbrella entry — install, authentication, routing to capability skills, chains reference       |
| `zerion-analyze`          | Read-only wallet insights: portfolio, positions, history, PnL, watchlist (supports x402 / MPP) |
| `zerion-trading`          | Swap, bridge, send tokens (on-chain actions; needs API key + agent token)                      |
| `zerion-sign`             | Off-chain signing — sign-message (EIP-191 / raw), sign-typed-data (EIP-712)                    |
| `zerion-wallet`           | Wallet management — create, import, list, fund, backup, delete, sync                           |
| `zerion-agent-management` | Agent tokens + policies (the autonomous-trading primitives)                                    |

Install or reinstall skills:

```bash theme={null}
zerion setup skills                          # all detected agents (default: global)
zerion setup skills --agent claude-code      # scope to one agent
zerion setup skills -g                       # force global install
```

Per-host plugin installs (alternative to `setup skills`):

```bash theme={null}
# Claude Code
/plugin marketplace add zeriontech/zerion-ai
/plugin install zerion-agent@zerion

# Cursor
npx skills add zeriontech/zerion-ai --agent cursor

# OpenCode
npx skills add zeriontech/zerion-ai --agent opencode

# Gemini CLI
gemini extensions install https://github.com/zeriontech/zerion-ai

# Any agentskills.io host
npx skills add zeriontech/zerion-ai
```

## Manual setup, agent execution

The CLI splits cleanly into two surfaces, by design.

* **Wallet management and agent token setup are manual.** `wallet create`, `import`, `backup`, and `delete` prompt for a passphrase. `wallet sync` emits a QR code you scan with the Zerion app. `agent create-token` mints a scoped trading credential bound to a specific wallet, and `agent create-policy` attaches the rules it must obey — allowed chains, expiry, transfer/approval gates, contract allowlists. No key material moves and no spending credential widens without you in the loop.
* **Analysis, signing, trading, and discovery are for agents.** `analyze`, `portfolio`, `positions`, `history`, `pnl`, `sign-message`, `sign-typed-data`, `swap`, `bridge`, `send`, `search`, `chains`, and read-only listings emit JSON to stdout, structured errors to stderr, and skip confirmation dialogs. Once an agent token is configured, signing and trading fire immediately.

You stage by hand once — create or import a wallet, set a passphrase, mint an agent token, attach a policy — then hand the agent token to an automation that can only do what the policy allows. Treat agent tokens like API keys with spending power.

## Commands

Every command supports `--help` for full flag documentation. Run `zerion --help` for the top-level command list.

### Analyze

Read-only wallet insights. Supports `--x402` and `--mpp` for pay-per-call.

```bash theme={null}
# Full analysis — portfolio, positions, transactions, PnL in parallel
zerion analyze vitalik.eth

# Targeted reads
zerion portfolio 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
zerion positions vitalik.eth --positions defi
zerion history vitalik.eth --limit 10 --chain ethereum
zerion pnl vitalik.eth
```

#### Analyze Options

| Command                           | Description                                                         |
| --------------------------------- | ------------------------------------------------------------------- |
| `zerion analyze <address\|ens>`   | Full analysis — portfolio, positions, transactions, PnL in parallel |
| `zerion portfolio <address\|ens>` | Portfolio value and top positions                                   |
| `zerion positions <address\|ens>` | Token + DeFi positions (`--positions all\|simple\|defi`)            |
| `zerion history <address\|ens>`   | Transaction history (`--limit`, `--chain`)                          |
| `zerion pnl <address\|ens>`       | Profit & loss (realized, unrealized, fees)                          |
| `zerion search <query>`           | Search tokens by name or symbol                                     |
| `zerion chains`                   | List supported chains                                               |

### Trade

Requires an API key plus an agent token for unattended use.

```bash theme={null}
# Same-chain swap
zerion swap usdc eth 100 --chain ethereum

# Cross-chain swap
zerion swap usdc eth 100 --chain base --to-chain ethereum

# Bridge with destination swap
zerion bridge usdc base 100 --to-token eth

# Send
zerion send usdc 50 --to 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 --chain base
```

#### Trade Options

| Command                                                       | Description                    |
| ------------------------------------------------------------- | ------------------------------ |
| `zerion swap <from> <to> <amount>`                            | Swap tokens on a single chain  |
| `zerion swap <from> <to> <amount> --to-chain <chain>`         | Cross-chain swap               |
| `zerion swap tokens [chain]`                                  | List tokens available for swap |
| `zerion bridge <token> <chain> <amount>`                      | Bridge tokens cross-chain      |
| `zerion bridge <token> <chain> <amount> --to-token <tok>`     | Bridge + swap on destination   |
| `zerion send <token> <amount> --to <address> --chain <chain>` | Send tokens                    |

### Sign

Off-chain signatures (EIP-191, EIP-712, Solana raw) — no broadcast. Requires an agent token.

```bash theme={null}
# EIP-191 (EVM) or raw (Solana)
zerion sign-message "Login to dApp" --chain ethereum

# Hex bytes
zerion sign-message 0xdeadbeef --encoding hex --chain ethereum

# EIP-712 typed data
zerion sign-typed-data --data "$(cat permit.json)"
zerion sign-typed-data --file permit.json
cat permit.json | zerion sign-typed-data
```

#### Sign Options

| Command                                         | Description                                |
| ----------------------------------------------- | ------------------------------------------ |
| `zerion sign-message <message> --chain <chain>` | Sign EIP-191 (EVM) or raw (Solana) message |
| `zerion sign-message <message> --encoding hex`  | Treat message as hex bytes                 |
| `zerion sign-typed-data --data '<json>'`        | Sign EIP-712 typed data (EVM only)         |
| `zerion sign-typed-data --file <path>`          | Read EIP-712 typed data from file          |

### Wallet

Encrypted local wallets. EVM + Solana supported. Passphrase required for destructive ops.

```bash theme={null}
zerion wallet create --name trading-bot
zerion wallet import --name old-wallet --evm-key
zerion wallet list
zerion wallet fund --wallet trading-bot
zerion wallet backup --wallet trading-bot
zerion wallet sync --wallet trading-bot
```

#### Wallet Options

| Command                                         | Description                                  |
| ----------------------------------------------- | -------------------------------------------- |
| `zerion wallet create --name <name>`            | Create encrypted wallet (EVM + Solana)       |
| `zerion wallet import --name <name> --evm-key`  | Import from EVM private key (interactive)    |
| `zerion wallet import --name <name> --sol-key`  | Import from Solana private key (interactive) |
| `zerion wallet import --name <name> --mnemonic` | Import from seed phrase (all chains)         |
| `zerion wallet list`                            | List all wallets                             |
| `zerion wallet fund`                            | Show deposit addresses for funding           |
| `zerion wallet backup --wallet <name>`          | Export recovery phrase                       |
| `zerion wallet delete <name>`                   | Permanently delete a wallet                  |
| `zerion wallet sync --wallet <name>`            | Sync wallet to Zerion app via QR code        |
| `zerion wallet sync --all`                      | Sync all wallets                             |

### Agent

Scoped API tokens for unattended trading. Tokens auto-save to config and are required for `swap`, `bridge`, `send`.

```bash theme={null}
# Create a tight policy first
zerion agent create-policy --name safe-base \
  --chains base \
  --expires 24h \
  --deny-transfers

# Mint a token bound to that policy
zerion agent create-token --name dca-bot \
  --wallet trading-bot \
  --policy safe-base
```

#### Agent Token Options

| Command                                                    | Description                   |
| ---------------------------------------------------------- | ----------------------------- |
| `zerion agent create-token --name <bot> --wallet <wallet>` | Create scoped token           |
| `zerion agent list-tokens`                                 | List active agent tokens      |
| `zerion agent use-token --wallet <wallet>`                 | Switch active token by wallet |
| `zerion agent revoke-token --name <bot>`                   | Revoke a token                |

#### Agent Policy Options

| Command                                      | Description                          |
| -------------------------------------------- | ------------------------------------ |
| `zerion agent create-policy --name <policy>` | Create security policy (flags below) |
| `zerion agent list-policies`                 | List all policies                    |
| `zerion agent show-policy <id>`              | Show policy details                  |
| `zerion agent delete-policy <id>`            | Delete a policy                      |

#### Policy Flags

| Flag                      | Description                                   |
| ------------------------- | --------------------------------------------- |
| `--chains <list>`         | Restrict to specific chains (comma-separated) |
| `--expires <duration>`    | Token expiry (e.g. `24h`, `7d`)               |
| `--deny-transfers`        | Block raw ETH/native transfers                |
| `--deny-approvals`        | Block ERC-20 approval calls                   |
| `--allowlist <addresses>` | Only allow listed contract/wallet addresses   |

### Watch

Track wallets by name without exposing addresses in commands.

```bash theme={null}
zerion watch 0xFe89Cc7Abb2C4183683Ab71653c4cCd1b9cC194e --name ens-dao
zerion analyze ens-dao
```

#### Watch Options

| Command                                 | Description             |
| --------------------------------------- | ----------------------- |
| `zerion watch <address> --name <label>` | Add wallet to watchlist |
| `zerion watch list`                     | List watched wallets    |
| `zerion watch remove <name>`            | Remove from watchlist   |

### Setup

| Command                                   | Description                                                                         |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| `zerion init`                             | One-shot onboarding — install CLI globally, configure API key, install agent skills |
| `zerion init -y --browser`                | Non-interactive init that opens dashboard.zerion.io for the API key                 |
| `zerion setup skills`                     | Install Zerion agent skills into detected coding agents                             |
| `zerion setup skills --agent claude-code` | Install into a specific agent                                                       |

### Config

| Command                           | Description                                                        |
| --------------------------------- | ------------------------------------------------------------------ |
| `zerion config set <key> <value>` | Set config (`apiKey`, `defaultWallet`, `defaultChain`, `slippage`) |
| `zerion config unset <key>`       | Remove a config value (resets to default)                          |
| `zerion config list`              | Show current configuration                                         |

## Global Options

| Flag                            | Description                                     |
| ------------------------------- | ----------------------------------------------- |
| `--wallet <name>`               | Specify wallet (default: from config)           |
| `--address <addr\|ens>`         | Use raw address or ENS name                     |
| `--watch <name>`                | Use watched wallet by name                      |
| `--chain <chain>`               | Specify chain (default: `ethereum`)             |
| `--to-chain <chain>`            | Destination chain for cross-chain swaps         |
| `--positions all\|simple\|defi` | Filter positions type                           |
| `--limit <n>`                   | Limit results (default: 20)                     |
| `--offset <n>`                  | Skip first N results                            |
| `--search <query>`              | Filter wallets by name or address               |
| `--slippage <percent>`          | Slippage tolerance (default: 2%)                |
| `--x402`                        | Pay-per-call on Base or Solana (analytics only) |
| `--mpp`                         | Pay-per-call on Tempo (analytics only)          |
| `--json`                        | JSON output (default)                           |
| `--pretty`                      | Human-readable output                           |
| `--quiet`                       | Minimal output                                  |

## Environment Variables

| Variable                    | Description                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| `ZERION_API_KEY`            | API key (get at [dashboard.zerion.io](https://dashboard.zerion.io))                             |
| `WALLET_PRIVATE_KEY`        | Pay-per-call key. `0x...` → x402 on Base; `base58` → x402 on Solana; `0x...` also works for MPP |
| `EVM_PRIVATE_KEY`           | EVM key for x402 on Base (overrides `WALLET_PRIVATE_KEY` for EVM)                               |
| `SOLANA_PRIVATE_KEY`        | Solana key for x402 on Solana (overrides `WALLET_PRIVATE_KEY` for Solana)                       |
| `TEMPO_PRIVATE_KEY`         | EVM key for MPP on Tempo (overrides `WALLET_PRIVATE_KEY` for MPP)                               |
| `ZERION_X402`               | `true` enables x402 globally (analytics only)                                                   |
| `ZERION_X402_PREFER_SOLANA` | `true` prefers Solana over Base when both keys set                                              |
| `ZERION_MPP`                | `true` enables MPP globally (analytics only)                                                    |
| `SOLANA_RPC_URL`            | Custom Solana RPC endpoint                                                                      |
| `ETH_RPC_URL`               | Custom Ethereum RPC endpoint (used for ENS resolution)                                          |

## Output Handling

All commands emit JSON to stdout (default) for agent compatibility. Errors emit JSON to stderr with a `code` field for programmatic handling.

```bash theme={null}
zerion portfolio vitalik.eth                 # JSON (default)
zerion portfolio vitalik.eth --pretty        # human-readable
zerion portfolio vitalik.eth --quiet         # minimal output
```

The CLI surfaces structured error codes for: missing or invalid API key, invalid address or ENS resolution failure, unsupported chain, empty wallets, rate limits (HTTP 429), and upstream timeouts.

## Examples

### Quick wallet check

```bash theme={null}
zerion analyze vitalik.eth
```

### DeFi-only positions on a single chain

```bash theme={null}
zerion positions vitalik.eth --positions defi --chain ethereum
```

### Stage an autonomous trading bot

```bash theme={null}
# 1. Create wallet
zerion wallet create --name trading-bot

# 2. Tight policy (Base only, 7-day expiry, no transfers)
zerion agent create-policy --name swap-only \
  --chains base \
  --expires 7d \
  --deny-transfers

# 3. Mint a scoped agent token
zerion agent create-token --name dca-bot \
  --wallet trading-bot \
  --policy swap-only

# 4. Agent can now swap on Base autonomously
zerion swap usdc eth 100 --chain base
```

### SIWE login for a dapp

```bash theme={null}
zerion sign-message "Sign in to dApp" --chain ethereum
```

### Pay-per-call without an API key

```bash theme={null}
export WALLET_PRIVATE_KEY="0x..."
zerion portfolio vitalik.eth --x402
```

### Compose with `jq`

```bash theme={null}
zerion portfolio vitalik.eth | jq '.totals.positions'
zerion history vitalik.eth --limit 50 | jq '.transactions[] | select(.type == "trade")'
```

## Open Source

The CLI and skills are MIT-licensed and open to contribution.

* **CLI + skills:** [github.com/zeriontech/zerion-ai](https://github.com/zeriontech/zerion-ai)
* **API docs:** [developers.zerion.io](https://developers.zerion.io)
* **Get an API key:** [dashboard.zerion.io](https://dashboard.zerion.io)


> ## Documentation Index
> Fetch the complete documentation index at: https://developers.zerion.io/llms.txt
> Use this file to discover all available pages before exploring further.

# Endpoints & Schema

> Overview of all Zerion API endpoint categories and response structure.

The Zerion API provides real-time, normalized access to onchain data through RESTful endpoints. All requests go to `https://api.zerion.io` and require [authentication](/authentication) via HTTP Basic Auth. Responses follow the [JSON:API](https://jsonapi.org/) specification.

## Endpoint categories

### [Wallets](/api-reference/wallets/get-wallet-portfolio)

Portfolio, positions, transactions, PnL, and NFTs — all scoped to a wallet address. This is the core of the API. Positions include both fungible tokens and DeFi protocol positions. NFT data is split into individual holdings, collections, and a portfolio summary.

All positions and transactions come with icons, labels, links, metadata, and relationships. Everything is ready to be immediately used in interfaces without additional interpretation or enrichment.

### [Fungibles](/api-reference/fungibles/get-list-of-fungible-assets)

Token metadata, pricing, and market data. Search and filter across all supported tokens, look up by Zerion ID or by chain and contract address, and fetch historical price charts.

### [Chains](/api-reference/chains/get-list-of-all-chains)

The full list of supported blockchains with metadata. Useful for populating chain selectors or validating chain IDs before making other calls.

### [NFTs](/api-reference/nfts/get-list-of-nfts)

Look up individual NFTs by reference or unique ID, with support for batch fetching.

### [Swap & Bridge](/api-reference/swap/get-fungibles-available-for-bridge)

Quotes for token swaps and cross-chain bridges, routed across DEXs and bridge protocols. First check which tokens are available for a route, then request offers.

### [Gas Prices](/api-reference/gas/get-list-of-all-available-gas-prices)

Current gas price estimates across all supported chains. Useful for displaying fee estimates or optimizing transaction timing.

### [DApps](/api-reference/dapps/get-list-of-dapps)

Metadata for decentralized applications — names, icons, and categories. DApp info is also embedded in position and transaction responses to provide context.

### [Subscriptions (Webhooks)](/api-reference/subscriptions-to-transactions/create-subscription)

Push-based notifications for wallet activity — no polling required. Create subscriptions, manage which wallets and chains to monitor, and update webhook URLs.

## Response structure

Every response follows a consistent [JSON:API](https://jsonapi.org/) format:

```json theme={null}
{
  "links": {
    "self": "https://api.zerion.io/v1/...",
    "next": "https://api.zerion.io/v1/...?page[after]=..."
  },
  "data": {
    "type": "positions",
    "id": "unique-id",
    "attributes": { ... },
    "relationships": { ... }
  }
}
```

| Field           | Description                                                        |
| --------------- | ------------------------------------------------------------------ |
| `links`         | Pagination — `self` for the current page, `next` for the next page |
| `data`          | A single resource object or an array of them                       |
| `type`          | Resource type (e.g., `positions`, `transactions`, `fungibles`)     |
| `id`            | Unique identifier for the resource                                 |
| `attributes`    | The resource's data fields                                         |
| `relationships` | Links to related resources                                         |

## Next steps

<CardGroup cols={3}>
  <Card title="Pagination & Filtering" icon="filter" href="/pagination-and-filtering">
    Paginate results and apply filters.
  </Card>

  <Card title="Error Handling" icon="circle-exclamation" href="/error-handling">
    Error codes and how to handle them.
  </Card>

  <Card title="Rate Limits" icon="gauge" href="/rate-limits">
    Request limits and how to stay within them.
  </Card>
</CardGroup>


> ## Documentation Index
> Fetch the complete documentation index at: https://developers.zerion.io/llms.txt
> Use this file to discover all available pages before exploring further.

# Pagination & Filtering

> How to paginate through results, filter data, sort responses, and set currency across Zerion API endpoints.

Most Zerion API list endpoints return paginated results and support filtering. This page covers the patterns you'll use across the API.

## Pagination

List endpoints use **cursor-based pagination**. Each response includes a `links` object with URLs for navigating between pages.

### How it works

1. Make your initial request without any page parameter
2. Check `links.next` in the response — if present, there are more results
3. Follow the `links.next` URL directly to get the next page
4. Repeat until `links.next` is absent

```json Response with pagination theme={null}
{
  "links": {
    "self": "https://api.zerion.io/v1/wallets/0x.../positions/?page[size]=10",
    "next": "https://api.zerion.io/v1/wallets/0x.../positions/?page[size]=10&page[after]=eyJhZnR..."
  },
  "data": [...]
}
```

Control the number of results per page with `page[size]`:

| Parameter    | Type    | Default | Min | Max   |
| ------------ | ------- | ------- | --- | ----- |
| `page[size]` | integer | `100`   | `1` | `100` |

<Warning>
  Do not construct `page[after]` cursor values manually. Always use the full URL from `links.next` — cursor tokens are opaque and may change format without notice.
</Warning>

### Iterating through all pages

<CodeGroup>
  ```javascript JavaScript theme={null}
  async function fetchAll(url, apiKey) {
    const results = [];

    while (url) {
      const response = await fetch(url, {
        headers: { Authorization: `Basic ${btoa(`${apiKey}:`)}` }
      });
      const json = await response.json();
      results.push(...json.data);
      url = json.links.next || null;
    }

    return results;
  }

  const positions = await fetchAll(
    "https://api.zerion.io/v1/wallets/0x.../positions/?page[size]=100",
    "YOUR_API_KEY"
  );
  ```

  ```python Python theme={null}
  import requests

  def fetch_all(url, api_key):
      results = []

      while url:
          response = requests.get(url, auth=(api_key, ""))
          data = response.json()
          results.extend(data["data"])
          url = data["links"].get("next")

      return results

  positions = fetch_all(
      "https://api.zerion.io/v1/wallets/0x.../positions/?page[size]=100",
      "YOUR_API_KEY"
  )
  ```
</CodeGroup>

## Filtering

Filter parameters use the `filter[field]` syntax. Pass multiple values as comma-separated:

```
?filter[chain_ids]=ethereum,base&filter[position_types]=deposit,staked
```

Common filters include `chain_ids`, `position_types`, `operation_types`, `trash`, `search_query`, and `fungible_ids`. Each endpoint documents its available filters and accepted values in the relevant API reference page, such as [wallet positions](/api-reference/wallets/get-wallet-fungible-positions), [wallet transactions](/api-reference/wallets/get-wallet-transactions), or [fungibles search](/api-reference/fungibles/get-list-of-fungible-assets). For spam filtering behavior, see the [spam filtering guide](/spam-filtering).

## Sorting

Some endpoints support a `sort` parameter. Prefix with `-` for descending order:

```
?sort=-value
```

Available sort fields vary by endpoint — check the relevant list endpoint in the API reference, such as [wallet positions](/api-reference/wallets/get-wallet-fungible-positions) or [wallet transactions](/api-reference/wallets/get-wallet-transactions), for supported options.

## Currency

Most endpoints that return monetary values accept a `currency` parameter. Default is `usd`.

```
?currency=eur
```

Supports major fiat currencies and `eth`/`btc`. See any currency-aware endpoint, such as [wallet positions](/api-reference/wallets/get-wallet-fungible-positions), for the full list.


Zerion CLI
CLI for Zerion Wallet. Analyze wallets, sign, swap, and bridge on-chain with agent-managed wallets across EVM chains and Solana, all from the command line. Wallet management is built on the Open Wallet Standard.

Note

Alpha Preview — This CLI is under active development. Commands, flags, and output formats may change or be removed without notice between releases. Do not depend on current behavior in production workflows.

Installation
npm install -g zerion-cli
Or set up everything in one command (install CLI globally, configure your API key, and add skills across all detected coding agents):

npx -y zerion-cli init -y --browser
-y runs setup non-interactively
--browser opens dashboard.zerion.io so you can grab an API key and paste it back
skills install globally to every detected AI coding agent by default
Requires Node.js 20 or later.

Agent skills
Six skills ship in this repo (under ./skills/):

Skill	What it does
zerion	Umbrella: install, authentication, routing to specific skills, chains reference
zerion-analyze	Portfolio, positions, history, PnL, analyze, token search, watchlist (read-only; supports x402 / MPP)
zerion-trading	Swap, bridge, send tokens (on-chain actions; needs API key + agent token)
zerion-sign	Off-chain signing — sign-message (EIP-191 / raw), sign-typed-data (EIP-712)
zerion-wallet	Wallet management — create, import, list, fund, backup, delete, sync
zerion-agent-management	Agent tokens + policies (the autonomous-trading primitives)
Skills follow the agentskills.io open standard — a single skills/ tree powers every supported host.

Install via zerion CLI (recommended)
zerion setup skills
Installs globally across all detected coding agents. Use --agent <name> to scope to one agent, or -g to force a global install.

Install via Claude Code
/plugin marketplace add zeriontech/zerion-ai
/plugin install zerion-agent@zerion
Install via OpenAI Codex CLI
codex plugin marketplace add zeriontech/zerion-ai
Then run /plugins in Codex, choose the zerion marketplace, and install zerion-agent.

Install via Gemini CLI
gemini extensions install https://github.com/zeriontech/zerion-ai
Install via agentskills.io (works with 20+ popular agents)
npx skills add zeriontech/zerion-ai
Auto-detects installed agents. Flags: -g (user-wide), -a <agent> (target one host), -y (non-interactive). Full ecosystem: https://agentskills.io/clients.

How to use
After install, ask the agent in natural language.

Wallet analysis
Analyze the wallet vitalik.eth. Summarize total portfolio value, top 5 holdings, and recent transactions.

What's the PnL on 0xFe89Cc7Abb2C4183683Ab71653c4cCd1b9cC194e over the last 30 days?

Show DeFi positions (lending, staking, LP) for my default wallet.

Trading
Swap 100 USDC to ETH on Base.

Bridge 50 USDC from Arbitrum to Optimism.

Send 0.1 ETH on Base to vitalik.eth.

Wallet management
Create a new encrypted wallet called bot-1.

Set up an agent token for bot-1 that's allowed to swap on Base only, with a 7-day expiry.

List my wallets and which agent tokens are active.

Signing
Sign the EIP-712 message in typed.json using my bot-1 wallet.

The agent reaches for the right skill (e.g. zerion-analyze for "what's in this wallet", zerion-trading for swap/bridge/send) and invokes the underlying zerion CLI commands. Skills load only when relevant — agentskills.io's progressive disclosure keeps your context window clean. Multiple skills compose at runtime: a "create wallet, set up agent token, then swap" flow loads zerion-wallet → zerion-agent-management → zerion-trading in sequence.

Manual setup, agent execution
Zerion CLI splits into two surfaces, by design.

Wallet management and agent token setup are manual. wallet create, import, backup, and delete all prompt for a passphrase. wallet sync emits a QR code you scan with the Zerion app. agent create-token mints a scoped trading credential bound to a specific wallet, and agent create-policy attaches the rules it has to obey — allowed chains, expiry, transfer/approval gates, contract allowlists. The sibling admin commands (agent list-tokens, use-token, revoke-token, list-policies, show-policy, delete-policy) are also gestures you make yourself. No key material moves and no spending credential widens without you in the loop.
Analysis, signing, trading, and discovery are for agents. analyze, portfolio, positions, history, pnl, sign-message, sign-typed-data, swap, bridge, send, swap tokens, search, chains, wallet list, wallet fund, and watch list emit JSON to stdout, structured errors to stderr, and skip confirmation dialogs. Once an agent token is configured, signing and trading fire immediately — the token authorizes operations on behalf of the wallet without a passphrase prompt.
Setup gestures (init, setup skills, config set/unset/list, watch add/remove) are one-time configuration steps you run yourself before automation takes over.

The split is the point. You stage by hand once — create or import a wallet, set a passphrase, mint an agent token, attach a policy — then hand the agent token to an automation that can only do what the policy allows. Treat agent tokens like API keys with spending power; use agent policies to scope them down to specific chains, addresses, or expiry windows.

Authentication
Three options. The CLI auto-detects which is active.

A) API key (recommended)
Get a key at dashboard.zerion.io — it's free and takes a minute. Keys begin with zk_.

export ZERION_API_KEY="zk_..."
HTTP Basic Auth
Required for analysis and trading commands (analysis can also use x402 / MPP pay-per-call instead — see options B and C)
You can also persist it via config:

zerion config set apiKey zk_...
B) x402 pay-per-call
No API key needed. Pay $0.01 USDC per request via the x402 protocol. Supports EVM (Base) and Solana.

Pay-per-call applies to analytics commands only (portfolio, positions, history, pnl, analyze). Trading commands always use an API key.

export WALLET_PRIVATE_KEY="0x..."     # EVM (Base) — 0x-prefixed hex
export WALLET_PRIVATE_KEY="5C1y..."   # Solana — base58 encoded keypair

zerion analyze 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 --x402
# or enable globally:
export ZERION_X402=true
Both chains simultaneously:

export EVM_PRIVATE_KEY="0x..."
export SOLANA_PRIVATE_KEY="5C1y..."
export ZERION_X402_PREFER_SOLANA=true   # optional, prefers Solana when both set
C) MPP pay-per-call
No API key needed. Pay $0.01 USDC per request via the MPP protocol on Tempo. EVM only.

export WALLET_PRIVATE_KEY="0x..."   # EVM key with USDC on Tempo
# or use a dedicated key:
export TEMPO_PRIVATE_KEY="0x..."

zerion portfolio 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 --mpp
# or enable globally:
export ZERION_MPP=true
Commands
Every command supports --help for full flag documentation. Run zerion --help for the top-level command list.

Wallet Analysis
Read-only. Supports --x402 and --mpp for pay-per-call.

Command	Description	Example
zerion analyze <address|ens>	Full analysis — portfolio, positions, transactions, PnL in parallel	zerion analyze vitalik.eth
zerion portfolio <address|ens>	Portfolio value and top positions	zerion portfolio 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
zerion positions <address|ens>	Token + DeFi positions (--positions all|simple|defi)	zerion positions vitalik.eth --positions defi
zerion history <address|ens>	Transaction history (--limit, --chain)	zerion history vitalik.eth --limit 10 --chain ethereum
zerion pnl <address|ens>	Profit & loss (realized, unrealized, fees)	zerion pnl vitalik.eth
zerion search <query>	Search tokens by name or symbol	zerion search USDC
zerion chains	List supported chains	zerion chains
Trading
Requires an API key (or agent token for unattended use).

Command	Description	Example
zerion swap <chain> <amount> <from-token> <to-token>	Same-chain swap	zerion swap base 1 USDC ETH
zerion swap solana <amount> <from-token> <to-token>	Solana same-chain swap	zerion swap solana 0.1 SOL USDC
zerion swap tokens [chain]	List tokens available for swap	zerion swap tokens solana
zerion bridge <from-chain> <from-token> <amount> <to-chain> <to-token>	Cross-chain bridge / bridge + swap	zerion bridge base USDC 5 arbitrum USDC
zerion bridge <from-chain> <from-token> <amount> <to-chain> <to-token> --to-token <tok>	Bridge + token swap on destination	zerion bridge base USDC 5 arbitrum ETH
zerion bridge … --to-wallet <name>	Bridge with explicit destination wallet (Solana ↔ EVM)	zerion bridge ethereum USDC 5 solana USDC --to-wallet sol-bot
zerion bridge … --to-address <addr>	Bridge to a raw destination address	zerion bridge ethereum USDC 5 solana USDC --to-address 8xLdox…
zerion send <token> <amount> --to <address> [--chain <chain>]	Send tokens (chain auto-detected from address format)	zerion send usdc 50 --to 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 --chain base
zerion send SOL <amount> --to <solana-pubkey>	Send native SOL on Solana	zerion send SOL 0.1 --to 2Nsnn…
Wallet Management
Encrypted local wallets. EVM + Solana supported. Passphrase required for all destructive ops.

Command	Description	Example
zerion wallet create --name <name>	Create encrypted wallet (EVM + Solana)	zerion wallet create --name trading-bot
zerion wallet import --name <name> --evm-key	Import from EVM private key (interactive)	zerion wallet import --name old-wallet --evm-key
zerion wallet import --name <name> --sol-key	Import from Solana private key (interactive)	zerion wallet import --name sol-bot --sol-key
zerion wallet import --name <name> --mnemonic	Import from seed phrase (all chains)	zerion wallet import --name backup --mnemonic
zerion wallet list	List all wallets	zerion wallet list
zerion wallet fund	Show deposit addresses for funding	zerion wallet fund --wallet trading-bot
zerion wallet backup --wallet <name>	Export recovery phrase	zerion wallet backup --wallet trading-bot
zerion wallet delete <name>	Permanently delete a wallet (requires passphrase)	zerion wallet delete trading-bot
zerion wallet sync --wallet <name>	Sync wallet to Zerion app via QR code	zerion wallet sync --wallet trading-bot
zerion wallet sync --all	Sync all wallets to Zerion app	zerion wallet sync --all
Signing
Command	Description	Example
zerion sign-message <message> --chain <chain>	Sign EIP-191 (EVM) or raw (Solana) message	zerion sign-message "Login to dApp" --chain ethereum
zerion sign-message <message> --encoding hex	Treat message as hex bytes	zerion sign-message 0xdeadbeef --encoding hex --chain ethereum
zerion sign-typed-data --data '<json>'	Sign EIP-712 typed data (EVM only)	zerion sign-typed-data --data "$(cat permit.json)"
zerion sign-typed-data --file <path>	Read EIP-712 typed data from file	zerion sign-typed-data --file permit.json
cat typed.json | zerion sign-typed-data	Read EIP-712 typed data from stdin	cat permit.json | zerion sign-typed-data
Agent Tokens
Scoped API tokens for unattended trading. Token auto-saves to config; required for swap, bridge, send.

Command	Description	Example
zerion agent create-token --name <bot> --wallet <wallet>	Create scoped token	zerion agent create-token --name dca-bot --wallet trading-bot
zerion agent list-tokens	List active agent tokens	zerion agent list-tokens
zerion agent use-token --wallet <wallet>	Switch active token by wallet	zerion agent use-token --wallet trading-bot
zerion agent revoke-token --name <bot>	Revoke a token	zerion agent revoke-token --name dca-bot
Agent Policies
Restrict what an agent token can do — chains, expiry, transfers, approvals, allowlists.

Command	Description	Example
zerion agent create-policy --name <policy>	Create security policy (flags below)	zerion agent create-policy --name safe-base --chains base --expires 24h --deny-transfers
zerion agent list-policies	List all policies	zerion agent list-policies
zerion agent show-policy <id>	Show policy details	zerion agent show-policy safe-base
zerion agent delete-policy <id>	Delete a policy	zerion agent delete-policy safe-base
Policy flags:

Flag	Description
--chains <list>	Restrict to specific chains (comma-separated)
--expires <duration>	Token expiry (e.g. 24h, 7d)
--deny-transfers	Block raw ETH/native transfers
--deny-approvals	Block ERC-20 approval calls
--allowlist <addresses>	Only allow listed contract/wallet addresses
Watchlist
Track wallets by name without exposing addresses in commands.

Command	Description	Example
zerion watch <address> --name <label>	Add wallet to watchlist	zerion watch 0xFe89Cc7Abb2C4183683Ab71653c4cCd1b9cC194e --name ens-dao
zerion watch list	List watched wallets	zerion watch list
zerion watch remove <name>	Remove from watchlist	zerion watch remove ens-dao
zerion analyze <name>	Analyze a watched wallet by name	zerion analyze ens-dao
Setup
Command	Description	Example
zerion init	One-shot onboarding — install CLI globally, configure API key, install agent skills	zerion init
zerion init -y --browser	Non-interactive init that opens dashboard.zerion.io for the API key	npx -y zerion-cli init -y --browser
zerion setup skills	Install Zerion agent skills into detected coding agents	zerion setup skills
zerion setup skills --agent claude-code	Install into a specific agent	zerion setup skills --agent claude-code
Configuration
Command	Description	Example
zerion config set <key> <value>	Set config (apiKey, defaultWallet, defaultChain, slippage)	zerion config set defaultChain base
zerion config unset <key>	Remove a config value (resets to default)	zerion config unset defaultChain
zerion config list	Show current configuration	zerion config list
Global Flags
Flag	Description
--wallet <name>	Source wallet (default: from config)
--address <addr|ens>	Use raw address or ENS name
--watch <name>	Use watched wallet by name
--chain <chain>	Chain for analysis commands (default: ethereum)
--to-wallet <name>	Destination wallet for bridge (Solana ↔ EVM)
--to-address <addr>	Destination address for bridge (must match destination-chain format)
--positions all|simple|defi	Filter positions type
--limit <n>	Limit results (default: 20 for list ops)
--offset <n>	Skip first N results (pagination)
--search <query>	Filter wallets by name or address
--slippage <percent>	Slippage tolerance (default: 2%)
--x402	Pay-per-call on Base or Solana (analytics only)
--mpp	Pay-per-call on Tempo (analytics only)
--json	JSON output (default)
--pretty	Human-readable output
--quiet	Minimal output
Environment Variables
Variable	Description
ZERION_API_KEY	API key (get at dashboard.zerion.io)
WALLET_PRIVATE_KEY	Pay-per-call key. 0x... → x402 on Base; base58 → x402 on Solana; 0x... also works for MPP
EVM_PRIVATE_KEY	EVM key for x402 on Base (overrides WALLET_PRIVATE_KEY for EVM)
SOLANA_PRIVATE_KEY	Solana key for x402 on Solana (overrides WALLET_PRIVATE_KEY for Solana)
TEMPO_PRIVATE_KEY	EVM key for MPP on Tempo (overrides WALLET_PRIVATE_KEY for MPP)
ZERION_X402	true enables x402 globally (analytics only)
ZERION_X402_PREFER_SOLANA	true prefers Solana over Base when both keys set
ZERION_MPP	true enables MPP globally (analytics only)
SOLANA_RPC_URL	Custom Solana RPC endpoint
ETH_RPC_URL	Custom Ethereum RPC endpoint (used for ENS resolution)
Output
All commands emit JSON to stdout (default) for agent compatibility. Errors emit JSON to stderr with a code field for programmatic handling. Use --pretty for human-readable output, --quiet for minimal.

Failure Modes
The CLI handles:

missing or invalid API key
invalid wallet address or ENS resolution failure
unsupported chain filter
empty wallets / no positions
rate limits (HTTP 429)
upstream timeout or temporary unavailability
All errors are emitted as structured JSON on stderr with a code field.

Development
npm install
npm test                  # unit tests (fast, offline)
npm run test:integration  # live API tests (requires ZERION_API_KEY, runs serially to avoid rate limits)
npm run test:all          # both
node ./cli/zerion.js --help
Contribution guidelines
Keep examples copy-pasteable.
Prefer official Zerion naming and documented behavior.
Document real gaps instead of inventing interfaces.
Preserve JSON-first CLI output for agent compatibility.
Releasing to npm
This repo uses release-please for automated versioning and publishing.

Commit conventions — use Conventional Commits prefixes:

feat: — new feature → minor version bump
fix: — bug fix → patch version bump
feat!: or fix!: — breaking change → major version bump
docs:, chore:, test: — no release triggered
Release flow:

Merge feat: or fix: commits to main
release-please opens/updates a release PR (chore(main): release X.Y.Z) with version bump and CHANGELOG
Merge the release PR when ready to ship
GitHub Release is created automatically → triggers npm publish
To force a specific version, add Release-As: 2.0.0 in a commit message body.

CI setup:

NPM_TOKEN repo secret is required for npm publish (use a granular access token)
.release-please-manifest.json tracks the current version
.github/workflows/release-please.yml handles release PR creation and npm publish
.github/workflows/test.yml runs tests on PRs and pushes to main
Resources
API documentation — https://developers.zerion.io/introduction
Get an API key — https://dashboard.zerion.io
Agent skills — ./skills/ (also installable via npx skills add zeriontech/zerion-ai)
Building with AI — https://developers.zerion.io/reference/building-with-ai
License
MIT — see LICENSE.


> ## Documentation Index
> Fetch the complete documentation index at: https://developers.zerion.io/llms.txt
> Use this file to discover all available pages before exploring further.

# Error Handling

> Understand Zerion API error responses, HTTP status codes, rate limits, and best practices for retry logic.

The Zerion API uses standard HTTP status codes and returns structured error responses. This page covers what to expect and how to handle errors gracefully.

## Error response format

All errors return a JSON object with an `errors` array:

```json theme={null}
{
  "errors": [
    {
      "title": "Short error description",
      "detail": "A longer explanation of what went wrong"
    }
  ]
}
```

## HTTP status codes

| Status | Meaning           | When it happens                                                                         |
| ------ | ----------------- | --------------------------------------------------------------------------------------- |
| `200`  | Success           | Request completed successfully                                                          |
| `400`  | Bad Request       | Malformed parameters — check filter values, missing required fields, or invalid formats |
| `401`  | Unauthorized      | Missing or invalid API key                                                              |
| `404`  | Not Found         | The requested resource doesn't exist (single-resource endpoints only)                   |
| `429`  | Too Many Requests | Rate limit exceeded                                                                     |
| `500`  | Server Error      | Unexpected error on Zerion's side — safe to retry with backoff                          |

### 400 — Bad Request

Returned when query parameters are malformed or invalid. Check the `detail` field for specifics.

```json theme={null}
{
  "errors": [
    {
      "title": "Malformed parameter was sent",
      "detail": "chain {invalidchain} is not supported"
    }
  ]
}
```

**Common causes:**

* Invalid `filter[chain_ids]` value (e.g., a chain ID that doesn't exist)
* `page[size]` outside the allowed range (the maximum varies by endpoint)
* Missing required parameters (e.g., `filter[references]` on the NFTs endpoint)
* Malformed `filter[min_mined_at]` timestamp (must be exactly 13 digits, in milliseconds)

### 401 — Unauthorized

Returned when the API key is missing, invalid, or incorrectly encoded.

```json theme={null}
{
  "errors": [
    {
      "title": "Unauthorized Error",
      "detail": "The API key is invalid, please, make sure that you are using a valid key"
    }
  ]
}
```

**Common causes:**

* Missing `Authorization` header
* API key not Base64-encoded correctly — remember to append a colon: `base64("your_key:")`
* Expired or revoked API key

<Tip>
  Test your encoding: `echo -n "your_api_key:" | base64` should produce the value you pass after `Basic `.
</Tip>

### 404 — Not Found

Returned on single-resource endpoints when the ID doesn't match any record.

```json theme={null}
{
  "errors": [
    {
      "title": "Requested fungible was not found",
      "detail": "You have requested fungible which does not exist"
    }
  ]
}
```

This only applies to endpoints like `/v1/fungibles/{fungible_id}` or `/v1/nfts/{nft_id}`. List endpoints return an empty `data` array instead of a 404.

### 429 — Too Many Requests

Returned when you exceed your plan's rate limit.

```json theme={null}
{
  "errors": [
    {
      "title": "Too many requests",
      "detail": "Your request had been throttled"
    }
  ]
}
```

Implement exponential backoff when retrying. For header details and retry guidance, see [Rate Limits](/rate-limits). If you're hitting limits consistently, see [Pricing](/pricing) to compare plans or upgrade in the [Dashboard](https://dashboard.zerion.io).

### 500 — Server Error

Returned when something unexpected goes wrong on Zerion's side.

```json theme={null}
{
  "errors": [
    {
      "title": "Internal Server Error",
      "detail": "An unexpected error occurred"
    }
  ]
}
```

These errors are safe to retry. Use exponential backoff (e.g., 1s, 2s, 4s) and cap your retries. If the error persists, reach out to support.

## Best practices

* **Retry on `429` and `500` only.** Do not retry `400` or `401` — these require fixing the request itself.
* **Use exponential backoff.** When retrying, increase the delay between attempts exponentially (e.g., 1s, 2s, 4s) to avoid overwhelming the API.
* **Validate parameters before sending.** Check that `page[size]` is within the endpoint's allowed range, timestamps are 13-digit milliseconds, and chain IDs match the [supported chains](/supported-blockchains). This avoids unnecessary `400` errors.
* **Use webhooks instead of polling.** If you need to monitor wallet activity, use [transaction subscriptions](/api-reference/subscriptions-to-transactions/create-subscription) instead of polling. This reduces API usage and gives you faster notifications.


> ## Documentation Index
> Fetch the complete documentation index at: https://developers.zerion.io/llms.txt
> Use this file to discover all available pages before exploring further.

# Rate Limits

> Understand rate limits and handle throttled requests.

Rate limits depend on your plan. See [Pricing](/pricing) for plan details, or visit the [Dashboard](https://dashboard.zerion.io) to view your current limits and usage.

## Monitoring usage

Every API response includes rate limit headers with your current limits and remaining quota. For a full usage breakdown, visit the [Dashboard](https://dashboard.zerion.io) and click **Open Analytics Dashboard**.

| Header                           | Description                               |
| -------------------------------- | ----------------------------------------- |
| `RateLimit-Org-Second-Limit`     | Maximum requests allowed per second       |
| `RateLimit-Org-Second-Remaining` | Requests remaining in the current second  |
| `RateLimit-Org-Second-Reset`     | Seconds until the per-second limit resets |
| `RateLimit-Org-Day-Limit`        | Maximum requests allowed per day          |
| `RateLimit-Org-Day-Remaining`    | Requests remaining today                  |
| `RateLimit-Org-Day-Reset`        | Seconds until the daily limit resets      |
| `RateLimit-Org-Month-Limit`      | Maximum requests allowed per month        |
| `RateLimit-Org-Month-Remaining`  | Requests remaining this month             |
| `RateLimit-Org-Month-Reset`      | Seconds until the monthly limit resets    |
| `RateLimit-Org-Tier`             | Your organization's plan tier name        |

## When you hit the limit

The API returns a `429 Too Many Requests` response:

```json theme={null}
{
  "errors": [
    {
      "title": "Too many requests",
      "detail": "Your request had been throttled"
    }
  ]
}
```

## Handling rate limits

Use the `RateLimit-Org-Second-Reset` header to wait the exact time needed before retrying a `429` response. If your day or month quota is exhausted, retrying won't help — check `RateLimit-Org-Day-Remaining` and `RateLimit-Org-Month-Remaining` first.

## Tips to stay under the limit

* **Use webhooks instead of polling** — [transaction subscriptions](/api-reference/subscriptions-to-transactions/create-subscription) give you real-time updates without repeated requests
* **Cache responses** where data doesn't change frequently (e.g., chain lists, token metadata)
* **Use filters and pagination** to fetch only the data you need — smaller requests, fewer calls


> ## Documentation Index
> Fetch the complete documentation index at: https://developers.zerion.io/llms.txt
> Use this file to discover all available pages before exploring further.

# Webhooks

> Receive real-time notifications when watched wallets send or receive transactions.

Zerion webhooks push transaction data to your server the moment activity is detected on a watched wallet — no polling required. You create a **subscription**, add wallet addresses, and Zerion sends a POST request to your callback URL for every new transaction.

<Info>
  Webhooks are part of the [Subscriptions to Transactions](/api-reference/subscriptions-to-transactions/create-subscription) API. This page explains how the system works. For a hands-on walkthrough, see the [Wallet Activity Alerts](/recipes/wallet-activity-alerts) recipe.
</Info>

## How it works

<Steps>
  <Step title="Create a subscription">
    Call [Create Subscription](/api-reference/subscriptions-to-transactions/create-subscription) with a `callback_url` and a list of wallet `addresses`. Optionally filter by `chain_ids` to limit which chains you monitor.
  </Step>

  <Step title="Zerion monitors the wallets">
    Zerion watches all specified wallets across the selected chains (or all supported chains if none are specified).
  </Step>

  <Step title="Your server receives notifications">
    When a watched wallet sends or receives a transaction, Zerion sends a POST request to your callback URL with the full transaction payload.
  </Step>
</Steps>

## Payload format

Every webhook notification is a POST request with a JSON body following the [JSON:API](https://jsonapi.org/) structure. The top-level `data` object describes the notification, while the `included` array contains the full transaction details.

```json theme={null}
{
  "data": {
    "id": "notification-id",
    "type": "callback",
    "attributes": {
      "timestamp": "2024-07-31T00:17:36Z",
      "callback_url": "https://example.com/callback",
      "address": "0x42b9df65b219b3dd36ff330a4dd8f327a6ada990"
    },
    "relationships": {
      "subscription": {
        "type": "tx-subscriptions",
        "id": "87db77a6-17eb-4ca8-af0e-e43cbe9c83c6"
      }
    }
  },
  "included": [
    {
      "type": "transactions",
      "id": "52d994a173d755e99845e861d534a419",
      "attributes": {
        "operation_type": "send",
        "hash": "0xabc123...",
        "mined_at": "2024-07-31T00:17:35Z",
        "mined_at_block": 7490818,
        "sent_from": "0x42b9df65b219b3dd36ff330a4dd8f327a6ada990",
        "sent_to": "0x1234567890abcdef1234567890abcdef12345678",
        "status": "confirmed",
        "nonce": 250,
        "fee": {
          "fungible_info": { "symbol": "ETH", "name": "Ethereum" },
          "quantity": { "float": 0.00042, "int": "420000000000000", "decimals": 18 }
        },
        "transfers": [
          {
            "direction": "out",
            "quantity": { "float": 0.5, "int": "500000000000000000", "decimals": 18 },
            "fungible_info": { "symbol": "ETH", "name": "Ethereum" }
          }
        ],
        "approvals": [],
        "application_metadata": null
      },
      "relationships": {
        "chain": { "type": "chains", "id": "ethereum" },
        "dapp": { "type": "dapps", "id": "" }
      }
    }
  ]
}
```

### Key fields

| Field                                  | Description                                                     |
| -------------------------------------- | --------------------------------------------------------------- |
| `data.attributes.address`              | The watched wallet that triggered this notification             |
| `data.relationships.subscription.id`   | The subscription this notification belongs to                   |
| `included[].attributes.operation_type` | Transaction type: `send`, `receive`, `trade`, `execute`, etc.   |
| `included[].attributes.status`         | `confirmed`, `failed`, or `pending`                             |
| `included[].attributes.transfers`      | Array of token movements with direction, amount, and token info |
| `included[].relationships.chain.id`    | The chain where the transaction occurred                        |

<Warning>
  Token prices are always `null` in webhook payloads. Prices are calculated asynchronously and are not available at the time of delivery. If you need prices, fetch them separately using the [Fungibles API](/api-reference/fungibles/get-fungible-asset-by-id).
</Warning>

## Signature verification

Every webhook request includes headers for verifying authenticity. Always verify signatures in production to ensure requests originate from Zerion.

| Header              | Description                            |
| ------------------- | -------------------------------------- |
| `X-Timestamp`       | ISO 8601 timestamp of the request      |
| `X-Signature`       | Base64-encoded RSA-SHA256 signature    |
| `X-Certificate-URL` | URL to download the public certificate |

### Verification steps

1. Concatenate the signing string: `${X-Timestamp}\n${request_body}\n`
2. Fetch the public certificate from the `X-Certificate-URL` header
3. Verify the `X-Signature` against the signing string using RSA-PKCS1v15 with SHA-256

<CodeGroup>
  ```python Python theme={null}
  import base64
  import requests
  from cryptography.x509 import load_pem_x509_certificate
  from cryptography.hazmat.primitives import hashes
  from cryptography.hazmat.primitives.asymmetric import padding

  def verify_webhook(timestamp, body, signature_b64, certificate_url):
      # Build the signing string
      signing_string = f"{timestamp}\n{body}\n"

      # Fetch and parse the certificate
      cert_pem = requests.get(certificate_url).content
      cert = load_pem_x509_certificate(cert_pem)
      public_key = cert.public_key()

      # Verify the signature
      signature = base64.b64decode(signature_b64)
      public_key.verify(
          signature,
          signing_string.encode(),
          padding.PKCS1v15(),
          hashes.SHA256()
      )
  ```

  ```javascript JavaScript theme={null}
  const crypto = require("crypto");

  async function verifyWebhook(timestamp, body, signatureB64, certificateUrl) {
    // Build the signing string
    const signingString = `${timestamp}\n${body}\n`;

    // Fetch the certificate
    const certResponse = await fetch(certificateUrl);
    const certPem = await certResponse.text();

    // Verify the signature
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(signingString);
    const isValid = verifier.verify(certPem, signatureB64, "base64");

    if (!isValid) {
      throw new Error("Invalid webhook signature");
    }
  }
  ```
</CodeGroup>

<Tip>
  Cache the certificate after the first fetch to avoid an extra HTTP call on every webhook. If signature verification fails, re-fetch the certificate in case it has rotated.
</Tip>

## Retry behavior

If your server fails to respond with a `2xx` status code, Zerion retries delivery up to **3 times**. After 3 failed attempts, the notification is dropped permanently.

To minimize missed notifications:

* Return a `200` response as quickly as possible — process the payload asynchronously
* Keep your endpoint available with high uptime
* Monitor your endpoint for errors and slow responses

## Rollbacks

If a transaction is removed from the canonical chain (e.g., due to a chain reorganization), Zerion sends a second webhook for the same transaction with `deleted: true` set on the transaction resource inside `included`:

```json theme={null}
{
  "data": {
    "id": "notification-id",
    "type": "callback",
    "attributes": {
      "timestamp": "2024-07-31T00:18:12Z",
      "callback_url": "https://example.com/callback",
      "address": "0x42b9df65b219b3dd36ff330a4dd8f327a6ada990"
    }
  },
  "included": [
    {
      "type": "transactions",
      "id": "52d994a173d755e99845e861d534a419",
      "attributes": {
        "hash": "0xabc123...",
        "deleted": true
      }
    }
  ]
}
```

When `included[0].attributes.deleted` is `true`, the transaction has been rolled back and is no longer part of the canonical chain. Use the transaction `hash` to match it against the original notification and remove or mark it accordingly in your system.

<Warning>
  A single transaction can trigger two webhooks: one on initial confirmation and one on rollback. Make sure your handler accounts for this rather than assuming one webhook per transaction.
</Warning>

## Delivery guarantees

Zerion webhooks are **best-effort**:

* **Not guaranteed** — if all 3 delivery attempts fail, the notification is dropped
* **Order is not guaranteed** — notifications may arrive out of order relative to on-chain transaction ordering
* **Duplicates are possible** — your server should handle the same notification arriving more than once

Design your webhook handler to be **idempotent**: use the transaction `hash` and `chain` to deduplicate, and don't assume notifications arrive in chronological order.

## Subscription limits

|                          | Free plan | Paid plan |
| ------------------------ | --------- | --------- |
| Wallets per subscription | 5         | Unlimited |

On the free plan, each subscription can monitor up to **5 wallets**. On a paid plan, there is no limit — you can add as many wallets as you need. The API accepts up to **100 wallets per request**, so for larger lists, batch your additions across multiple calls.

## Testing webhooks

Use [webhook.site](https://webhook.site) to get a temporary callback URL for testing:

1. Go to [webhook.site](https://webhook.site) and copy your unique URL
2. Create a subscription with that URL as the `callback_url`
3. Trigger a transaction on a watched wallet
4. Inspect the payload and headers on webhook.site

If you want to test with your own URL or move to production, go to the [Dashboard](https://dashboard.zerion.io) and click **Support** to request whitelisting for your callback URL.


> ## Documentation Index
> Fetch the complete documentation index at: https://developers.zerion.io/llms.txt
> Use this file to discover all available pages before exploring further.

# Spam Filtering

> How Zerion detects and filters spam tokens across positions and transactions.

Zerion's API includes a built-in spam detection system that flags low-quality or deceptive assets. Each asset and transaction includes an `is_trash` boolean in the response, which you can use to filter out spam without building your own detection logic.

How `is_trash` is determined depends on the data type: for positions, it's a per-asset classification that applies the same way for every wallet. For transactions, it's computed dynamically based on the querying wallet's history — the same transaction can be spam for one wallet and not for another.

## How it works

### Positions: per-asset classification

For positions, `is_trash` is a property of the asset itself. The same token is classified the same way for every wallet. The classification is based on multiple signals:

* **Heuristics** — Analysis of on-chain behaviors including mass airdrops, impersonation of popular assets (e.g., mimicking name/symbol), and suspicious transfer patterns.
* **External intelligence** — Multiple third-party data providers to assess token quality.
* **Community feedback** — Users and partners can report false positives or unflagged spam for review.
* **Internal rules** — Proprietary logic applied across the system to ensure consistent filtering across APIs and frontend views.

```json theme={null}
{
  "type": "positions",
  "attributes": {
    "fungible_info": {
      "name": "Fake USDC",
      "symbol": "USDC"
    },
    "is_trash": true,
    "quantity": { "float": 1000.0 }
  }
}
```

### Transactions: context-aware classification

For transactions, `is_trash` is computed dynamically per request based on the querying wallet's history. The same transaction can be `is_trash: true` for one wallet and `is_trash: false` for another. The evaluation runs through multiple layers:

1. **User-initiated check** — If the wallet owner sent the transaction themselves, it's never flagged as spam.
2. **Interaction history** — Even if a transaction looks spammy (e.g., a low-value airdrop of an unverified asset), it's overridden to non-spam if the wallet has previously interacted with that asset.
3. **Address poisoning detection** — Incoming transfers are checked against the wallet's known legitimate recipients. If the sender address visually resembles a real address the user has sent to (matching first and last few characters), it's flagged as a poisoning attempt — a scam where attackers send tiny transfers from look-alike addresses to trick users into copying the wrong recipient.
4. **Rule-based checks** — Spam scores, mass transfer detection, blacklisted contracts, and spam NFT mint patterns.

<Info>
  Because transaction spam classification depends on the querying wallet's context, the same airdrop transaction might be hidden for a wallet that has never interacted with the token, but visible for a wallet that has traded it before.
</Info>

### NFT collections

Spam NFT collections are filtered out by default — no spam collections are returned in API responses. Unlike fungible positions, there is no `filter[trash]` toggle for NFT collections.

## Using the `filter[trash]` parameter

The `filter[trash]` parameter controls spam filtering on supported endpoints:

| Value            | Behavior                                 |
| ---------------- | ---------------------------------------- |
| `only_non_trash` | Only return non-spam assets (hides spam) |
| `only_trash`     | Only return spam assets                  |
| `no_filter`      | Return everything, spam included         |

### Default behavior

<Note>
  Defaults differ by endpoint:

  * **Positions**: defaults to `only_non_trash` (spam hidden)
  * **Transactions**: defaults to `no_filter` (spam included) — because transaction spam is context-aware, returning everything by default lets you apply your own filtering logic on top
</Note>

### Examples

```bash theme={null}
# Get positions with spam hidden (default)
curl -u "YOUR_API_KEY:" \
  "https://api.zerion.io/v1/wallets/0xd8dA.../positions/?filter[trash]=only_non_trash"

# Get only spam tokens
curl -u "YOUR_API_KEY:" \
  "https://api.zerion.io/v1/wallets/0xd8dA.../positions/?filter[trash]=only_trash"

# Get everything including spam
curl -u "YOUR_API_KEY:" \
  "https://api.zerion.io/v1/wallets/0xd8dA.../positions/?filter[trash]=no_filter"
```

## Reporting misclassifications

If you notice an asset that's incorrectly flagged or missing a flag, report it by clicking **Support** in the [Zerion dashboard](https://dashboard.zerion.io).