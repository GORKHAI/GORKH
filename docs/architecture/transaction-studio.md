# GORKH Transaction Studio v0.1

Transaction Studio is the Solana transaction safety workbench inside the GORKH desktop app. It is a read-only review layer for:

- Decode
- Simulate
- Explain
- Risk review
- Safe handoff

It does not sign, broadcast, submit bundles, execute wallet actions, or call autonomous agent execution.

## Safety Boundary

Transaction Studio v0.1 blocks:

- Signing
- `sendTransaction`
- `sendRawTransaction`
- `requestAirdrop`
- Raw transaction broadcast
- Jito bundle submission
- MEV bundle execution
- Private key, seed phrase, or wallet JSON access
- Cloak note or viewing key access
- Zerion API key or token access
- Arbitrary shell execution

The Agent can prepare a review-only handoff for Transaction Studio, but it cannot simulate, sign, execute, or broadcast from chat.

## Inputs

Supported inputs:

- Solana transaction signatures
- Serialized transaction base64
- Serialized transaction base58 detection
- Solana addresses
- Agent draft handoffs
- Cloak draft handoffs
- Zerion proposal handoffs
- Shield and Builder review handoffs

Base64 serialized transactions are decoded offline with the existing Shield decoder. Transaction Studio then layers safe deterministic instruction summaries for System Program, SPL Token, Token-2022, Compute Budget, and Memo instructions. Base58 raw transaction decode is detected and clearly labeled coming soon; GORKH does not fake decode unsupported input.

## Simulation

Simulation is explicit-click only and uses the existing read-only RPC allowlist. It is labeled **Current-State Simulation** because it uses advisory RPC state and does not guarantee future execution. When the safe helper supports it, signature verification is disabled for preview and the UI says so.

Allowed RPC methods stay constrained to read-only lookup and simulation. Broadcast methods are denied. For richer review, simulation may request post-simulation account snapshots for already referenced signer/writable accounts; it does not introduce arbitrary RPC methods.

## Balance Diffs

Balance diffs are best effort. Transaction Studio displays SOL and SPL token diffs when RPC transaction metadata includes pre/post balances, including closed-token-account cases. Simulation account snapshots are shown as post-simulation balances when available; they are not treated as guaranteed deltas unless pre-state metadata exists. Otherwise it shows: "No balance diff data available from this source."

## Handoffs

Cloak and Zerion handoffs are review-only. If no raw transaction exists, Transaction Studio shows summary-only context:

- "Cloak draft summary only; no transaction available for decode."
- "Zerion proposal summary only; no transaction available for decode."

No Cloak execute path or Zerion execute path is called by Transaction Studio.

## Context Snapshot

Transaction Studio writes a redacted local context snapshot at:

`gorkh.solana.transactionStudio.lastContext.v1`

It includes input kind, decoded summary, risk summary, simulation summary, balance diff summary, explanation summary, timestamp, and redactions. It excludes raw transaction payloads, private keys, seed phrases, wallet JSON, Cloak notes, viewing keys, Zerion credentials, and raw signing material.

## Locked Roadmap

Coming soon:

- Visual Transaction Builder
- Batch Transaction Builder
- Priority Fee Advisor
- Replay Against Current State

Locked advanced:

- Jito Bundle Composer
- Raw Transaction Broadcast

Locked advanced features remain disabled until signing, simulation, policy, and approval gates are fully implemented.
