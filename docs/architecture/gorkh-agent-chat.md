# GORKH Agent Chat — v0.4

GORKH Agent Chat is the conversational interface for **Agent → GORKH Agent**
inside the desktop app. It is local-first and uses the existing Agent Station
runtime, policy engine, tool router, handoff storage, and audit log.

## Product boundary

GORKH Agent Chat is not Telegram, WhatsApp, Discord, a cloud bot, or an
always-on daemon. It runs only inside the GORKH desktop app while the app is
open.

The chat can:

- answer safe capability questions;
- summarize local Wallet and Markets state;
- prepare Shield review handoffs;
- prepare Cloak draft handoffs;
- prepare Zerion proposal handoffs;
- summarize stored Builder context;
- create redacted context bundles.

The chat cannot:

- sign transactions;
- execute transactions;
- run autonomous Cloak sends or deposits;
- run autonomous Zerion swaps;
- use the main wallet without approval;
- execute arbitrary shell commands;
- access or store secrets.

## Planning mode

Deterministic planning is the default.

LLM planning is scaffolded but disabled by default:

- `plannerMode: deterministic`
- `allowLlmPlanning: false`
- `requireRedactedContext: true`

If LLM planning is enabled in a later phase, only redacted context may be sent
and the LLM may only suggest a plan. The deterministic router and policy engine
must validate every tool request.

## Storage

Chat state is stored under:

`gorkh.solana.agentStation.chat.v1`

The store contains non-sensitive thread metadata, messages, tool card metadata,
redacted context summaries, settings, and run status. It rejects private keys,
seed phrases, wallet JSON, Cloak note secrets, viewing keys, API keys, Zerion
tokens, agent tokens, raw signing payloads, raw notes, and raw UTXOs.

## Handoffs

Handoff buttons navigate or prefill only:

- **Open Wallet → Cloak Private** sends a Cloak draft to Wallet.
- **Open Agent → Zerion Executor** sends a Zerion proposal to the executor tab.
- **Open Shield** preloads the candidate input.
- **Copy Context Bundle** copies redacted markdown.

No button in chat executes a transaction.

v0.4 adds durable action resolution. Actionable tool cards store
`relatedHandoffEntryId` and resolve the Cloak, Zerion, Shield, or Context
payload from the existing Agent Station handoff store after reload. The card
never reconstructs sensitive or executable payloads from chat text.
