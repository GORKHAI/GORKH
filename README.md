# GORKH

GORKH is an Apple-first Solana workstation for read-only wallet intelligence, market context, transaction safety, Solana/Anchor development workflows, and policy-bound agent planning.

## What GORKH Is

GORKH is a desktop-first Solana workstation. The Tauri desktop app is the primary product surface, with the web app, API, and iOS project supporting account, handoff, coordination, and companion workflows.

The current workstation is safety-first. It is read-only, draft-only, and planner-only where blockchain actions are involved. GORKH does not currently sign transactions, submit transactions, custody assets, or execute Solana actions.

The product direction is non-custodial: wallet profiles are address-first, browser wallet interactions are limited to handoff and optional ownership proof, and private key material is intentionally outside the app.

## Workstation Modules

### Wallet

Wallet supports local address-only wallet profiles, browser wallet handoff, and optional wallet ownership proof through browser `signMessage`. Ownership proof is verified locally with Ed25519 and is only used to prove control of a public address.

Wallet snapshots are manual and read-only. The module can show SOL balance, token account previews, a portfolio tab, and bridges for adding wallet or token holdings to the Markets watchlist. Private send and receive flows are planner-only drafts. There is no private key import, seed phrase entry, wallet JSON import, custody, transaction signing, or transaction execution.

### Markets

Markets provides local watchlists, read-only wallet and token intelligence, RPC-based token mint analysis, wallet snapshots, and risk signals. It includes a market data provider shell, deterministic sample offline market data, and a manual Birdeye read-only token market fetch.

Birdeye requires a user-provided API key for manual fetches. The key is memory-only and is never persisted by GORKH. Markets does not provide swaps, routes, trades, orders, auto-buy, auto-sell, MEV, sniper, leverage, perps, or Drift integration.

### Shield

Shield provides offline Solana transaction decode, read-only RPC lookup, transaction simulation preview, lookup table resolution, and risk findings. It is an inspection and explanation surface only. It does not sign, submit, or execute transactions.

### Builder

Builder is a read-only Solana/Anchor workspace inspector. It can inspect local project structure, parse `Anchor.toml`, parse IDLs, analyze logs, preview safe files, and run diagnostic command allowlist checks.

Build, test, deploy, install, validator, and custom command workflows remain blocked or draft-only. GORKH does not execute Anchor builds, tests, or deployments.

### Agent

Agent is a mainnet-safe Solana Agent Control Center foundation. It supports local agent profiles, policies, protocol permissions, action drafts, local audit events, and accountability or attestation previews.

Agent actions are drafts and previews. There is no autonomous execution, on-chain write, wallet signing, or transaction submission.

### Context

Context exports sanitized workstation context across Wallet, Markets, Shield, Builder, and Agent surfaces. Exports are local and manual copy-paste oriented. GORKH does not auto-send workstation context to an LLM.

## Safety Model

GORKH currently enforces these product boundaries:

- No private key import.
- No seed phrase entry.
- No wallet JSON import.
- No custody.
- No transaction signing.
- No transaction execution.
- `signMessage` is used only for optional wallet ownership proof.
- No swaps, trades, routes, orders, auto-trading, sniping, MEV, leverage, or perps.
- No automatic polling or monitoring for wallet or markets data.
- Birdeye API keys are memory-only and never persisted.
- Drift is excluded.
- HumanRail and White Protocol are not production dependencies.

Older development or research references may mention removed protocols or legacy names, but the production-facing workstation registry excludes Drift, HumanRail, and White Protocol.

## Architecture

```text
apps/
  desktop/   Tauri 2 + React desktop workstation
  web/       Next.js portal and browser wallet handoff surface
  api/       Fastify backend for auth, devices, billing, updater/feed, and coordination
  ios/       SwiftUI companion project, built separately in Xcode

packages/
  shared/    Shared Zod schemas, protocol definitions, and Solana workstation types

docs/
  release/   Apple/macOS release readiness, beta dry-run, and stable sign-off docs
  qa/        Workstation QA checklist and known issues

scripts/
  check-release-readiness.mjs and supporting validation scripts
```

Current workspace package identity:

- `@gorkh/shared`
- `@gorkh/api`
- `@gorkh/desktop`
- `@gorkh/web`
- `@gorkh/ios`

The root package is still named `ai-operator` and some legacy identifiers remain for bundle and updater continuity, including `com.ai-operator.desktop` in the Tauri config. User-facing documentation and product copy should present the product as GORKH.

## Development

Prerequisites:

- Node.js 20 or newer.
- pnpm 9.15.0, as declared by the root `packageManager`.
- Rust stable for Tauri desktop checks and builds.
- Xcode for the iOS companion project.

Install dependencies:

```bash
pnpm install
```

Run all JavaScript/TypeScript apps in development mode:

```bash
pnpm dev
```

Run the desktop app:

```bash
pnpm --filter @gorkh/desktop dev
pnpm --filter @gorkh/desktop tauri:dev
```

Run the API:

```bash
pnpm --filter @gorkh/api dev
```

Run the web app:

```bash
pnpm --filter @gorkh/web dev
```

Common validation commands:

```bash
pnpm -w typecheck
pnpm -w build
pnpm -w test
pnpm --filter @gorkh/shared typecheck
pnpm --filter @gorkh/shared test
pnpm --filter @gorkh/desktop typecheck
pnpm --filter @gorkh/desktop build
pnpm --filter @gorkh/api typecheck
pnpm --filter @gorkh/api test
pnpm --filter @gorkh/web typecheck
pnpm --filter @gorkh/web build
pnpm check:desktop:security
pnpm check:release:readiness
```

Desktop Rust checks:

```bash
pnpm --filter @gorkh/desktop check:rust:fmt
pnpm --filter @gorkh/desktop check:rust:clippy
pnpm --filter @gorkh/desktop tauri:check
```

The iOS package is present as `@gorkh/ios`, but its pnpm scripts only print guidance. Build and type checking happen separately in Xcode.

## Desktop / Apple Release Readiness

macOS is the stable target. The desktop app uses Tauri 2 with product name `GORKH`, a configured macOS icon, updater configuration, hardened CSP checks, and Apple/macOS release documentation.

Relevant release and QA docs:

- `docs/release/apple-macos-readiness.md`
- `docs/release/apple-beta-dry-run.md`
- `docs/release/stable-release-signoff.md`
- `docs/qa/workstation-qa-checklist.md`
- `docs/qa/known-issues.md`

Stable release work should only proceed after the release gates pass, manual macOS artifact validation is complete, and the release owner explicitly approves the release. Do not create tags, publish release artifacts, run release workflows, or change Apple signing/notarization configuration as part of normal development.

## Current Status

The workstation shell is present in the desktop app with Wallet, Markets, Shield, Builder, Agent, and Context modules.

Current implemented foundations include:

- Wallet address-only profiles, browser handoff, optional local ownership proof verification, manual RPC snapshots, token previews, and portfolio/watchlist bridge.
- Markets read-only watchlists, RPC-based wallet/token analysis, risk signals, sample market data, provider registry shell, and manual Birdeye read-only fetch.
- Shield offline decode, read-only RPC lookup, simulation preview, and risk findings.
- Builder workspace inspection, Anchor/IDL parsing, log analysis, safe file preview, and diagnostic command guardrails.
- Agent local profiles, policies, protocol permissions, action drafts, audit events, and attestation previews.
- Context sanitized local export with manual assistant copy-paste.

All blockchain execution paths remain disabled. A stable-looking git tag `v0.0.48` exists, and `v0.1.0-beta.1` also exists, but production release status still depends on the release docs, signed artifact validation, and explicit sign-off.

## Roadmap

Near-term work should stay aligned with the safety model:

- Validate macOS artifacts on real Apple hardware.
- Harden the real browser wallet handoff and ownership proof flow.
- Expand read-only RPC and market data providers.
- Design optional external wallet signing only after the explicit safety architecture is complete.
- Research private and confidential route integrations as planner-only or read-only flows first.
- Add transaction execution only after a reviewed architecture for signing, approvals, simulation, accountability, and failure handling.

## Non-Goals / Disabled Features

- No custody.
- No private key import.
- No local generated wallet yet.
- No transaction signing or execution.
- No swaps, trading, routes, or orders.
- No auto-trading, sniping, MEV, leverage, or perps.
- No Drift integration.
- No HumanRail or White Protocol production dependency.

## License

License: not specified.
