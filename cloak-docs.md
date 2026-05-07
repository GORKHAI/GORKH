cloak docs: > ## Documentation Index
> Fetch the complete documentation index at: https://docs.cloak.ag/llms.txt
> Use this file to discover all available pages before exploring further.

# Quickstart

> Minimal mainnet setup with SOL send plus full and partial withdrawals

Use this page when you want the smallest possible end-to-end Cloak integration.

This snippet covers:

* shielded SOL deposit
* full withdrawal (send)
* partial withdrawal (keep change private)

```typescript theme={null}
import {
  CLOAK_PROGRAM_ID,
  NATIVE_SOL_MINT,
  createUtxo,
  createZeroUtxo,
  fullWithdraw,
  generateUtxoKeypair,
  partialWithdraw,
  transact,
} from "@cloak.dev/sdk";
import { Connection, Keypair } from "@solana/web3.js";

const connection = new Connection(
  "https://api.mainnet-beta.solana.com",
  "confirmed",
);
const signer = Keypair.fromSecretKey(/* Uint8Array secret key */);

const amount = 1_000_000_000n; // 1 SOL
const owner = await generateUtxoKeypair();
const depositOutput = await createUtxo(amount, owner, NATIVE_SOL_MINT);

const deposited = await transact(
  {
    inputUtxos: [await createZeroUtxo(NATIVE_SOL_MINT)],
    outputUtxos: [depositOutput],
    externalAmount: amount,
    depositor: signer.publicKey,
  },
  {
    connection,
    programId: CLOAK_PROGRAM_ID,
    depositorKeypair: signer,
    walletPublicKey: signer.publicKey,
  },
);

const recipient = Keypair.generate().publicKey;

// Full withdrawal: sends all spendable value externally.
await fullWithdraw(deposited.outputUtxos, recipient, {
  connection,
  programId: CLOAK_PROGRAM_ID,
  depositorKeypair: signer,
  walletPublicKey: signer.publicKey,
  cachedMerkleTree: deposited.merkleTree,
});

// OR partial withdrawal: withdraw a portion, keep private change in shielded state.
// await partialWithdraw(deposited.outputUtxos, recipient, 200_000_000n, {
//   connection,
//   programId: CLOAK_PROGRAM_ID,
//   depositorKeypair: signer,
//   walletPublicKey: signer.publicKey,
//   cachedMerkleTree: deposited.merkleTree,
// });
```

## One-file CLI contract (recommended for one-shot scripts)

For minimal script generation, keep this exact interface:

* file: `send-sol-private.ts`
* command: `npx tsx send-sol-private.ts <recipientPubkey> <lamports>`
* env vars: `SOLANA_RPC_URL`, `KEYPAIR_PATH`

Guardrails:

* keep tx amounts as `bigint`
* use `KEYPAIR_PATH` (file-based keypair), not raw private key env vars
* do not parse SOL decimals with float math (`parseFloat`, `AMOUNT_SOL`)
* read recipient/amount from `process.argv` (`<recipientPubkey> <lamports>`), not `RECIPIENT_ADDRESS`/`SEND_LAMPORTS` env vars
* keep `programId` fixed to `CLOAK_PROGRAM_ID` internally
* rely on SDK stale-root retries for standard flows
* call `process.exit(0)` on success and `process.exit(1)` on failure

## Mainnet smoke test (keypair bytes)

Use this when you want a first real send with explicit runtime values.

```bash theme={null}
export SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"

# Must be an absolute path. Do not rely on `~` expansion inside env files.
export KEYPAIR_PATH="/Users/you/.config/solana/id.json"
```

Sanity-check before running:

```bash theme={null}
solana-keygen pubkey "$KEYPAIR_PATH"
solana balance "$(solana-keygen pubkey "$KEYPAIR_PATH")" --url "$SOLANA_RPC_URL"
```

Run your script entrypoint that wraps the snippet above:

```bash theme={null}
npx tsx send.ts "<recipient-wallet-pubkey>" "50000000"
```

## Funding and net amount

For SOL withdraw/send paths:

* `gross = abs(externalAmount)`
* `fee = 5_000_000 + floor(gross * 3 / 1000)`
* `net = gross - fee`

Worked example (`gross = 50_000_000`, i.e. `0.05 SOL`):

* fee = `5_150_000` lamports (`0.00515 SOL`)
* net = `44_850_000` lamports (`0.04485 SOL`)

Recommended first-run sender balance for this smoke test: `0.07 SOL` or higher.

Next: [Code Examples](/sdk/examples)



> ## Documentation Index
> Fetch the complete documentation index at: https://docs.cloak.ag/llms.txt
> Use this file to discover all available pages before exploring further.

# Code Examples

> Concise mainnet examples for send, swap, payroll, and compliance history

All examples use the current default program ID:

* `zh1eLd6rSphLejbFfJEneUwzHRfMKxgzrgkfwA6qRkW`

## Shared setup

```typescript theme={null}
import {
  CLOAK_PROGRAM_ID,
  NATIVE_SOL_MINT,
  createUtxo,
  createZeroUtxo,
  fullWithdraw,
  generateUtxoKeypair,
  getNkFromUtxoPrivateKey,
  partialWithdraw,
  swapWithChange,
  transact,
  scanTransactions,
  toComplianceReport,
} from "@cloak.dev/sdk";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const USDT_MINT = new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB");

const connection = new Connection(
  "https://api.mainnet-beta.solana.com",
  "confirmed",
);
const signer = Keypair.fromSecretKey(/* Uint8Array secret key */);
const scanKeypair = await generateUtxoKeypair();
const viewingKeyNk = getNkFromUtxoPrivateKey(scanKeypair.privateKey);

const baseOptions = {
  connection,
  programId: CLOAK_PROGRAM_ID,
  depositorKeypair: signer,
  walletPublicKey: signer.publicKey,
  chainNoteViewingKeyNk: viewingKeyNk,
};
```

## Send flow (SOL->SOL, USDC->USDC, USDT->USDT)

```typescript theme={null}
async function sendSameMint(args: {
  mint: PublicKey;
  amount: bigint;
  recipientWallet: PublicKey;
  partialWithdrawAmount?: bigint; // use for partial withdrawal example
}) {
  const owner = await generateUtxoKeypair();
  const output = await createUtxo(args.amount, owner, args.mint);

  const deposited = await transact(
    {
      inputUtxos: [await createZeroUtxo(args.mint)],
      outputUtxos: [output],
      externalAmount: args.amount,
      depositor: signer.publicKey,
    },
    baseOptions,
  );

  if (args.partialWithdrawAmount !== undefined) {
    return partialWithdraw(
      deposited.outputUtxos,
      args.recipientWallet,
      args.partialWithdrawAmount,
      {
        ...baseOptions,
        cachedMerkleTree: deposited.merkleTree,
      },
    );
  }

  return fullWithdraw(deposited.outputUtxos, args.recipientWallet, {
    ...baseOptions,
    cachedMerkleTree: deposited.merkleTree,
  });
}

// SOL -> SOL (full withdrawal send)
await sendSameMint({
  mint: NATIVE_SOL_MINT,
  amount: 1_000_000_000n,
  recipientWallet: Keypair.generate().publicKey,
});

// USDC -> USDC (recipient wallet must have a USDC ATA)
await sendSameMint({
  mint: USDC_MINT,
  amount: 8_000_000n,
  recipientWallet: Keypair.generate().publicKey,
});

// USDT -> USDT (recipient wallet must have a USDT ATA)
await sendSameMint({
  mint: USDT_MINT,
  amount: 8_000_000n,
  recipientWallet: Keypair.generate().publicKey,
});

// Partial withdrawal example (withdraw part, keep private change)
await sendSameMint({
  mint: NATIVE_SOL_MINT,
  amount: 1_000_000_000n,
  recipientWallet: Keypair.generate().publicKey,
  partialWithdrawAmount: 250_000_000n,
});
```

## SOL swap flow (SOL -> token)

```typescript theme={null}
const swapOwner = await generateUtxoKeypair();
const swapInput = await createUtxo(600_000_000n, swapOwner, NATIVE_SOL_MINT);

const swapDeposit = await transact(
  {
    inputUtxos: [await createZeroUtxo(NATIVE_SOL_MINT)],
    outputUtxos: [swapInput],
    externalAmount: 600_000_000n,
    depositor: signer.publicKey,
  },
  baseOptions,
);

const recipientWallet = Keypair.generate().publicKey;
const recipientUsdcAta = getAssociatedTokenAddressSync(
  USDC_MINT,
  recipientWallet,
);

await swapWithChange(
  [swapDeposit.outputUtxos[0]],
  300_000_000n, // amount to swap
  USDC_MINT,
  recipientUsdcAta,
  1n, // replace with quote-based min output
  {
    ...baseOptions,
    cachedMerkleTree: swapDeposit.merkleTree,
  },
  recipientWallet,
);
```

## Payroll flow (multi-recipient private payouts)

```typescript theme={null}
const payroll = [
  { wallet: Keypair.generate().publicKey, amount: 250_000_000n },
  { wallet: Keypair.generate().publicKey, amount: 400_000_000n },
  { wallet: Keypair.generate().publicKey, amount: 350_000_000n },
];

for (const payment of payroll) {
  await sendSameMint({
    mint: NATIVE_SOL_MINT,
    amount: payment.amount,
    recipientWallet: payment.wallet,
  });
}
```

## History + compliance scan

```typescript theme={null}
// Reuse the same `viewingKeyNk` configured in your transaction options.

const scan = await scanTransactions({
  connection,
  programId: CLOAK_PROGRAM_ID,
  viewingKeyNk,
  limit: 250,
});

const report = toComplianceReport(scan);
console.log(report.summary);
```


> ## Documentation Index
> Fetch the complete documentation index at: https://docs.cloak.ag/llms.txt
> Use this file to discover all available pages before exploring further.

# Solana Kit integration

> Use Cloak SDK from apps that standardize on @solana/kit

If your app stack is built around `@solana/kit`, you can still use Cloak SDK today.

Current state:

* Use Kit for RPC reads, subscriptions, and signer architecture.
* Use a thin `@solana/web3.js` bridge for Cloak transaction calls (`transact`, `partialWithdraw`, `swapWithChange`, etc.).

## Install

```bash theme={null}
npm install @cloak.dev/sdk @solana/web3.js @solana/kit
```

## Minimal bridge pattern

```typescript theme={null}
import {
  CLOAK_PROGRAM_ID,
  createUtxo,
  createZeroUtxo,
  generateUtxoKeypair,
  partialWithdraw,
  transact,
} from "@cloak.dev/sdk";
import { address, createSolanaRpc } from "@solana/kit";
import { Connection, Keypair } from "@solana/web3.js";

const rpcUrl = process.env.SOLANA_RPC_URL!;
const programId = CLOAK_PROGRAM_ID;

// Kit client for read paths.
const kitRpc = createSolanaRpc(rpcUrl);

// web3 bridge for Cloak transaction paths.
const connection = new Connection(rpcUrl, "confirmed");
const signer = Keypair.fromSecretKey(/* Uint8Array secret key */);

const { value: before } = await kitRpc
  .getBalance(address(signer.publicKey.toBase58()))
  .send();

const owner = await generateUtxoKeypair();
const output = await createUtxo(20_000_000n, owner);

const deposit = await transact(
  {
    inputUtxos: [await createZeroUtxo()],
    outputUtxos: [output],
    externalAmount: 20_000_000n,
    depositor: signer.publicKey,
  },
  {
    connection,
    programId,
    depositorKeypair: signer,
  },
);

await partialWithdraw(
  deposit.outputUtxos,
  Keypair.generate().publicKey,
  5_000_000n,
  {
    connection,
    programId,
    depositorKeypair: signer,
    cachedMerkleTree: deposit.merkleTree,
  },
);

const { value: after } = await kitRpc
  .getBalance(address(signer.publicKey.toBase58()))
  .send();
console.log(before.toString(), after.toString());
```

## Related examples

Use the concise snippets in [Code Examples](/sdk/examples), then adapt them to your Kit app runtime.


> ## Documentation Index
> Fetch the complete documentation index at: https://docs.cloak.ag/llms.txt
> Use this file to discover all available pages before exploring further.

# Core concepts

> Current primitives: UTXOs, fees, viewing keys, scanner, and root retries

## Canonical transaction path

The active runtime path is UTXO transactions through:

* `transact` for deposit/withdraw/transfer
* `swapWithChange` / `swapUtxo` for swap flows
* SDK-managed submit and status lifecycle

Note-model and UTXO-model methods are both part of v1, with UTXO-first integrations recommended for most apps.

## Commitments and Merkle tree

Each deposit/output creates a Poseidon commitment and appends it to the on-chain Merkle tree.

* Height: `32`
* Root history: `100` recent roots

Proof generation needs:

* Leaf index
* Path elements/indices
* A root still present in root history

## Nullifiers

Spending creates a nullifier. The program rejects a reused nullifier.

This is the core double-spend guard for both note and UTXO flows.

## Stale-root retries

If your proof root is no longer in history, transactions can fail with `RootNotFound` (`0x1001`).

The SDK includes retry paths that:

* fetch fresh Merkle data
* regenerate proof
* resubmit

## Fee model: gross, fee, net

Shared constants:

* Fixed fee: `5_000_000` lamports
* Variable fee: `amount * 3 / 1000`
* Minimum deposit: `10_000_000` lamports

For SOL withdrawals/swaps:

* `gross` = absolute public withdrawal amount
* `fee` = fixed + variable
* `net` = `gross - fee`

## Proof data shapes

* UTXO transact and swap requests use `264`-byte public inputs:
  `root + publicAmount + extDataHash + mint + nullifiers + commitments + chainNoteHash`.
* Proof bytes are always `256` bytes (Groth16).

## Viewing key registration

* SDK flows enforce viewing-key registration by default before protocol transactions.
* Registration is a signed wallet challenge bound to a 32-byte viewing key (`nk`).
* Registration is cached in-process to avoid repeat calls.

## Chain-native scanner and cache model

* `scanTransactions` reads chain transactions directly from RPC.
* It decrypts compact chain notes with viewing key `nk` and verifies `chainNoteHash` integrity.
* It computes per-tx `gross`, `fee`, `netAmount`, and running balance.
* Client apps can store encrypted report snapshots locally and expose explicit cache clear + rescan.

## Related pages

* UTXO details: [UTXO Transactions](/sdk/utxo-transactions)
* Protocol rules: [Shield Pool Program](/protocol/shield-pool)
* Runtime flow: [Transaction Flows](/platform/transaction-flows)



> ## Documentation Index
> Fetch the complete documentation index at: https://docs.cloak.ag/llms.txt
> Use this file to discover all available pages before exploring further.

# UTXO Transactions

> Transact, swap, viewing-key registration, and scanner-friendly transaction flows

The UTXO API is the current production path for SDK-based app integrations.

## Core APIs

* `transact(params, options)`
* `transfer(...)`
* `partialWithdraw(...)`
* `fullWithdraw(...)`
* `swapUtxo(...)`
* `swapWithChange(...)`

All are exported from `@cloak.dev/sdk`.

## Transaction semantics

```typescript theme={null}
import type { Utxo, TransactParams, TransactOptions } from "@cloak.dev/sdk";

interface TransactParams {
  inputUtxos: Utxo[];
  outputUtxos: Utxo[];
  recipient?: PublicKey;
  externalAmount?: bigint; // +deposit, -withdraw, 0=shield-to-shield
}
```

`externalAmount` rules:

* `> 0`: public deposit into the pool
* `< 0`: public withdrawal from the pool
* `0`: fully shielded transfer

Under the hood, SDK builds proof + `264`-byte public inputs and submits the resulting on-chain transaction.

## Fees

* SOL withdraw/swap:
  * `gross = abs(externalAmount)`
  * `fee = 5_000_000 + floor(gross * 3 / 1000)`
  * `net = gross - fee`
* Deposits have no protocol fee but still must satisfy min deposit (`10_000_000` lamports)

SDK helpers you can call directly:

* SOL: `calculateSolFeeLamports`, `calculateSolNetAmountLamports`

## Create UTXOs

```typescript theme={null}
import {
  createUtxo,
  generateUtxoKeypair,
  NATIVE_SOL_MINT,
} from "@cloak.dev/sdk";

const keypair = await generateUtxoKeypair();
const utxo = await createUtxo(100_000_000n, keypair, NATIVE_SOL_MINT);
```

## Deposit example (`transact`)

<CodeGroup>
  ```typescript Keypair bytes theme={null}
  import {
    CLOAK_PROGRAM_ID,
    transact,
    createUtxo,
    generateUtxoKeypair,
  } from "@cloak.dev/sdk";
  import { Connection, Keypair } from "@solana/web3.js";

  const connection = new Connection(process.env.SOLANA_RPC_URL!, "confirmed");
  const programId = CLOAK_PROGRAM_ID;
  const depositorKeypair = Keypair.fromSecretKey(secretKeyBytes);

  const owner = await generateUtxoKeypair();
  const output = await createUtxo(20_000_000n, owner); // 0.02 SOL

  const result = await transact(
  {
  inputUtxos: [],
  outputUtxos: [output],
  externalAmount: 20_000_000n,
  },
  {
  connection,
  programId,
  depositorKeypair,
  }
  );

  console.log(result.signature, result.commitmentIndices);

  ```

  ```typescript Wallet adapter theme={null}
  import { transact, createUtxo, createZeroUtxo, generateUtxoKeypair } from "@cloak.dev/sdk";
  import { useWallet } from "@solana/wallet-adapter-react";

  const { publicKey, signTransaction } = useWallet();

  const owner = await generateUtxoKeypair();
  const output = await createUtxo(20_000_000n, owner);

  const result = await transact(
    {
      inputUtxos: [await createZeroUtxo()],
      outputUtxos: [output],
      externalAmount: 20_000_000n,
      depositor: publicKey!,
    },
    {
      connection,
      programId,
      signTransaction: signTransaction!,
      depositorPublicKey: publicKey!,
      walletPublicKey: publicKey!,
    }
  );
  ```
</CodeGroup>

## Withdraw and transfer helpers

<CodeGroup>
  ```typescript Keypair bytes theme={null}
  import { transfer, partialWithdraw, fullWithdraw } from "@cloak.dev/sdk";

  await transfer(inputUtxos, recipientUtxoPublicKey, 30_000_000n, options);
  await partialWithdraw(inputUtxos, recipientWallet, 10_000_000n, options);
  await fullWithdraw(inputUtxos, recipientWallet, options);

  ```

  ```typescript Wallet adapter theme={null}
  import { transfer, partialWithdraw, fullWithdraw } from "@cloak.dev/sdk";

  const walletOptions = {
    connection,
    programId,
    relayUrl,
    walletPublicKey: publicKey!,
    signMessage: signMessage!,
  };

  await transfer(inputUtxos, recipientUtxoPublicKey, 30_000_000n, walletOptions);
  await partialWithdraw(inputUtxos, recipientWallet, 10_000_000n, walletOptions);
  await fullWithdraw(inputUtxos, recipientWallet, walletOptions);
  ```
</CodeGroup>

`partialWithdraw`/`fullWithdraw` use negative `externalAmount` semantics.

## Swap example

<CodeGroup>
  ```typescript Keypair bytes theme={null}
  import { swapWithChange } from "@cloak.dev/sdk";

  await swapWithChange(
  inputUtxos,
  50_000_000n, // swap amount (lamports)
  outputMint,
  recipientAta,
  1_000_000n, // min output
  {
  connection,
  programId,
  },
  recipientWallet
  );

  ```

  ```typescript Wallet adapter theme={null}
  import { swapWithChange } from "@cloak.dev/sdk";

  await swapWithChange(
    inputUtxos,
    50_000_000n,
    outputMint,
    recipientAta,
    1_000_000n,
    {
      connection,
      programId,
      relayUrl,
      walletPublicKey: publicKey!,
      signMessage: signMessage!,
    },
    publicKey!
  );
  ```
</CodeGroup>

`swapWithChange` sends a `TransactSwap` payload (`proof + 264-byte public inputs + swap params`).

## Viewing-key registration requirements

* Default behavior enforces viewing-key registration before protocol txs.
* `TransactOptions.enforceViewingKeyRegistration` defaults to `true`.
* Registration signs the fixed sign-in message and submits the registration record.

If viewing key is missing, history and decrypt flows cannot resolve your transaction data.

## Risk-oracle deposits

When deposits require Range/Switchboard validation, include:

* `riskOracleQueue`
* `riskQuoteUrl` (or `getRiskQuoteInstruction`)

The SDK can fetch risk quotes for you; you can also provide your own quote backend or a direct instruction callback.

If deposit account list is large, use v0 transactions with `addressLookupTableAccounts`.

## Operational notes

* Amounts use `bigint` in the UTXO API.
* Proof retries are built in for stale roots (`0x1001`).
* SDK-side Merkle reconstruction is preferred for older indices.
* Optional `cachedMerkleTree` helps sequential txs avoid extra rebuild/fetch.
* Optional `useUniqueNullifiers` helps repeated development runs avoid nullifier collisions.

## Troubleshooting

* `Invalid public inputs size`: the protocol expects `264` bytes, not `232`.
* `RootNotFound` / `0x1001`: regenerate proof with fresh root (SDK retry usually handles this).
* `0x1020` in local repeated runs: set `CLOAK_UNIQUE_NULLIFIERS=1`.
* `viewing key not found`: re-run a transaction with registration enabled, then rescan history.

## Next

* Protocol behavior: [Shield Pool Program](/protocol/shield-pool)
* Runtime lifecycle: [Transaction Flows](/platform/transaction-flows)
* Full SDK exports: [API Reference](/sdk/api-reference)


> ## Documentation Index
> Fetch the complete documentation index at: https://docs.cloak.ag/llms.txt
> Use this file to discover all available pages before exploring further.

# Wallet integration

> Integrate Cloak SDK with Solana wallet-adapter in web apps

## Install

```bash theme={null}
npm install @cloak.dev/sdk @solana/web3.js @solana/wallet-adapter-react
```

If your app standardizes on `@solana/kit`, add it as well and use the bridge pattern in [Solana Kit Integration](/sdk/kit-integration).

```bash theme={null}
npm install @solana/kit
```

Add wallet UI packages as needed:

```bash theme={null}
npm install @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets
```

## Note-based integration (`CloakSDK`)

```typescript theme={null}
import { useMemo } from "react";
import { CloakSDK } from "@cloak.dev/sdk";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

export function useCloak() {
  const { publicKey, signTransaction, sendTransaction } = useWallet();

  return useMemo(() => {
    if (!publicKey || !sendTransaction) return null;

    return new CloakSDK({
      wallet: { publicKey, signTransaction, sendTransaction },
      network: "mainnet",
      programId: new PublicKey("zh1eLd6rSphLejbFfJEneUwzHRfMKxgzrgkfwA6qRkW"),
    });
  }, [publicKey, signTransaction, sendTransaction]);
}
```

## UTXO integration with wallet signing

For UTXO `transact` deposits in browser apps, pass wallet signing fields in `TransactOptions`:

```typescript theme={null}
const result = await transact(params, {
  connection,
  programId,
  relayUrl,
  signTransaction, // wallet adapter signer
  depositorPublicKey, // wallet public key
  riskOracleQueue, // if required by deployment
  riskQuoteUrl, // risk quote backend (if needed)
  addressLookupTableAccounts,
});
```

Make sure your wallet supports `signMessage` so viewing-key registration can complete before transactions.

## Full wallet-adapter SOL send flow (`transact` -> `fullWithdraw`)

```typescript theme={null}
import {
  CLOAK_PROGRAM_ID,
  NATIVE_SOL_MINT,
  createUtxo,
  createZeroUtxo,
  fullWithdraw,
  generateUtxoKeypair,
  isRootNotFoundError,
  transact,
} from "@cloak.dev/sdk";
import { Connection, PublicKey } from "@solana/web3.js";

const connection = new Connection(process.env.SOLANA_RPC_URL!, "confirmed");
const programId = CLOAK_PROGRAM_ID;

async function sendWithWalletAdapter({
  walletPublicKey,
  signTransaction,
  signMessage,
  recipientAddress,
  amountLamports,
}: {
  walletPublicKey: PublicKey;
  signTransaction: (tx: any) => Promise<any>;
  signMessage: (msg: Uint8Array) => Promise<Uint8Array>;
  recipientAddress: string;
  amountLamports: bigint;
}) {
  const owner = await generateUtxoKeypair();
  const output = await createUtxo(amountLamports, owner, NATIVE_SOL_MINT);

  const deposited = await transact(
    {
      inputUtxos: [await createZeroUtxo(NATIVE_SOL_MINT)],
      outputUtxos: [output],
      externalAmount: amountLamports,
      depositor: walletPublicKey,
    },
    {
      connection,
      programId,
      signTransaction,
      depositorPublicKey: walletPublicKey,
      walletPublicKey,
      onProgress: (status) => console.log("deposit", status),
      onProofProgress: (percent) => console.log("deposit proof", percent),
    },
  );

  const recipient = new PublicKey(recipientAddress);
  let withdrawResult: Awaited<ReturnType<typeof fullWithdraw>> | undefined;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      withdrawResult = await fullWithdraw(deposited.outputUtxos, recipient, {
        connection,
        programId,
        walletPublicKey,
        signMessage,
        cachedMerkleTree: deposited.merkleTree,
        onProgress: (status) => console.log("withdraw", status),
        onProofProgress: (percent) => console.log("withdraw proof", percent),
      });
      break;
    } catch (error) {
      if (!isRootNotFoundError(error) || attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1_500));
    }
  }

  if (!withdrawResult) throw new Error("withdraw did not produce a result");

  return {
    depositSignature: deposited.signature,
    withdrawSignature: withdrawResult.signature,
  };
}
```

Notes:

* Keep amount values as `bigint` end-to-end.
* Use `cachedMerkleTree` from deposit for the immediate withdraw call.
* Treat `isRootNotFoundError` as retryable with bounded backoff.

## UX requirements

* Show progress during proof generation (`onProgress`, `onProofProgress`).
* Handle stale-root retries gracefully (`isRootNotFoundError`).
* Keep circuit files accessible in browser deployments.
* Ensure viewing-key registration succeeds before transact/swap actions.
* For privacy history pages, expose explicit cache clear + rescan controls after swaps or failed scans.

## Related pages

* [Quickstart](/sdk/quickstart)
* [UTXO Transactions](/sdk/utxo-transactions)
* [Error Handling](/sdk/error-handling)



> ## Documentation Index
> Fetch the complete documentation index at: https://docs.cloak.ag/llms.txt
> Use this file to discover all available pages before exploring further.

# Error handling

> Current SDK error types, stale-root retries, and relay/on-chain diagnostics

## SDK error surfaces

`@cloak.dev/sdk` exposes two main layers:

1. `CloakError` (runtime SDK operations)
2. `parseError` / `parseTransactionError` (user-facing normalization)

## `CloakError`

```typescript theme={null}
import { CloakError } from "@cloak.dev/sdk";

// category values:
// "network" | "indexer" | "prover" | "relay" | "validation" | "wallet" | "environment"
```

Most app flows should treat `retryable === true` as backoff-eligible.

## Stale Merkle root (`0x1001`)

Use helpers for RootNotFound detection:

<CodeGroup>
  ```typescript Keypair bytes theme={null}
  import { isRootNotFoundError, RootNotFoundError } from "@cloak.dev/sdk";

  try {
  await sdk.withdraw(connection, note, recipient);
  } catch (error) {
  if (error instanceof RootNotFoundError || isRootNotFoundError(error)) {
  // Refresh proof inputs and retry flow
  }
  }

  ```

  ```typescript Wallet adapter theme={null}
  import { isRootNotFoundError, RootNotFoundError } from "@cloak.dev/sdk";

  try {
    await partialWithdraw(inputUtxos, recipient, 10_000_000n, {
      connection,
      programId,
      relayUrl,
      walletPublicKey: publicKey!,
      signMessage: signMessage!,
    });
  } catch (error) {
    if (error instanceof RootNotFoundError || isRootNotFoundError(error)) {
      // Rebuild with fresh commitments/root and retry
    }
  }
  ```
</CodeGroup>

SDK note and UTXO flows already include retry loops; this usually appears only after retries are exhausted.

## On-chain error message mapping

`ShieldPoolErrors` maps known custom program codes:

```typescript theme={null}
import { ShieldPoolErrors } from "@cloak.dev/sdk";

console.log(ShieldPoolErrors[0x1001]); // Root not found in the roots ring
console.log(ShieldPoolErrors[0x1076]); // Proof verification failed
```

## User-facing normalization

<CodeGroup>
  ```typescript Keypair bytes theme={null}
  import { parseError, type UserFriendlyError } from "@cloak.dev/sdk";

  try {
  await sdk.swap(connection, note, recipient, swapOptions);
  } catch (error) {
  const parsed: UserFriendlyError = parseError(error);
  // parsed.category: wallet | network | validation | service | transaction | unknown
  // parsed.recoverable: boolean
  }

  ```

  ```typescript Wallet adapter theme={null}
  import { parseError, type UserFriendlyError } from "@cloak.dev/sdk";

  try {
    await swapWithChange(inputUtxos, amountLamports, outputMint, recipientAta, minOutput, {
      connection,
      programId,
      relayUrl,
      walletPublicKey: publicKey!,
      signMessage: signMessage!,
    });
  } catch (error) {
    const parsed: UserFriendlyError = parseError(error);
    // parsed.category / parsed.recoverable
  }
  ```
</CodeGroup>

## Practical retry strategy

* Retry network and service failures with exponential backoff.
* Avoid retrying deterministic validation failures.
* On stale-root errors, rebuild proof data before retrying.

## UTXO stale-root retry template

```typescript theme={null}
import { fullWithdraw, isRootNotFoundError } from "@cloak.dev/sdk";

let result: Awaited<ReturnType<typeof fullWithdraw>> | undefined;
let cachedMerkleTree = initialMerkleTree;

for (let attempt = 1; attempt <= 3; attempt += 1) {
  try {
    result = await fullWithdraw(inputUtxos, recipientWallet, {
      connection,
      programId,
      relayUrl,
      walletPublicKey,
      signMessage,
      cachedMerkleTree,
    });
    break;
  } catch (error) {
    if (!isRootNotFoundError(error) || attempt === 3) throw error;
    await new Promise((resolve) => setTimeout(resolve, 1_500 * attempt));
    // refresh proof inputs before retrying (new root + updated tree)
    cachedMerkleTree = undefined;
  }
}

if (!result) throw new Error("withdraw did not complete");
```

## Security logging rule

Never log full notes/UTXOs with secrets. Log only non-sensitive identifiers (commitment prefix, leaf index, request ID, and tx signature when needed for support).


> ## Documentation Index
> Fetch the complete documentation index at: https://docs.cloak.ag/llms.txt
> Use this file to discover all available pages before exploring further.

# API reference

> Current public API for @cloak.dev/sdk

This page tracks the current public exports of `@cloak.dev/sdk`.

## Main client: `CloakSDK`

### Constructor

```typescript theme={null}
new CloakSDK({
  keypairBytes?: Uint8Array;
  wallet?: WalletAdapter;
  network?: "mainnet";
  cloakKeys?: CloakKeyPair;
  storage?: StorageAdapter;
  programId?: PublicKey;
  relayUrl?: string;
  debug?: boolean;
})
```

At least one signer path is required: `keypairBytes` or `wallet`.

### Core methods

```typescript theme={null}
sdk.deposit(connection, amountOrNote, options?) => Promise<DepositResult>
sdk.withdraw(connection, note, recipient, options?) => Promise<TransferResult>
sdk.send(connection, note, recipients, options?) => Promise<TransferResult>
sdk.swap(connection, note, recipient, options) => Promise<SwapResult>
```

Also available:

```typescript theme={null}
sdk.privateTransfer(connection, note, recipients, options?)
sdk.generateNote(amountLamports, useWalletKeys?)
sdk.getMerkleProof(connection, leafIndex)
sdk.getCurrentRoot(connection)
sdk.getTransactionStatus(requestId)
```

Storage/key helpers on the class:

```typescript theme={null}
sdk.loadNotes();
sdk.saveNote(note);
sdk.findNote(commitment);
sdk.importWalletKeys(keysJson);
sdk.exportWalletKeys();
sdk.getConfig();
```

## Note API types

```typescript theme={null}
type DepositResult = {
  note: CloakNote;
  signature: string;
  leafIndex: number;
  root: string;
};

type TransferResult = {
  signature: string;
  outputs: Array<{ recipient: string; amount: number }>;
  nullifier: string;
  root: string;
};
```

## UTXO API

Common UTXO transaction exports:

```typescript theme={null}
transact(params, options)
transfer(inputUtxos, recipientPubkey, amount, options)
partialWithdraw(inputUtxos, recipient, withdrawAmount, options)
fullWithdraw(inputUtxos, recipient, options)
swapUtxo(params, options)
swapWithChange(inputUtxos, swapAmount, outputMint, recipientAta, minOutputAmount, options, recipientWallet?)
```

UTXO primitives:

```typescript theme={null}
generateUtxoKeypair()
createUtxo(amount, keypair, mint?)
createZeroUtxo(mint?)
computeUtxoCommitment(utxo)
computeUtxoNullifier(utxo)
```

Full flow guide: [UTXO Transactions](/sdk/utxo-transactions)

## Relay and proof utilities

```typescript theme={null}
new RelayService(baseUrl)
relay.submitWithdraw(...)
relay.submitSwap(...)
relay.getStatus(requestId)
relay.resumeWithdraw(requestId)

computeProofFromChain(connection, merkleTreePDA, leafIndex)
readMerkleTreeState(connection, merkleTreePDA)
buildMerkleTreeFromRelay(relayUrl)
```

Notes:

* UTXO transact/swap flows submit 256-byte proofs and 264-byte public inputs.
* `RelayService` is the low-level submission client; the high-level `CloakSDK` class wraps it for you.

## Fee constants

```typescript theme={null}
FIXED_FEE_LAMPORTS      // 5_000_000
VARIABLE_FEE_NUMERATOR  // 3
VARIABLE_FEE_DENOMINATOR// 1000
MIN_DEPOSIT_LAMPORTS    // 10_000_000
VARIABLE_FEE_RATE       // 0.003
Q64_64_ONE              // 2^64

calculateFee(amount: number)
calculateFeeBigint(amount: bigint)
calculateSolFeeLamports(gross: bigint)
calculateSolNetAmountLamports(gross: bigint)

tokenPerSolBaseUnitsToQ64(price: bigint)
q64ToTokenPerSolBaseUnits(priceQ64: bigint)
calculateSplFixedFeeTokenAmount(priceQ64: bigint)
calculateSplFeeTokenAmount(grossTokenBaseUnits: bigint, priceQ64: bigint)
calculateSplNetAmountToken(grossTokenBaseUnits: bigint, priceQ64: bigint)

isWithdrawAmountSufficient(amount: bigint)
isSplWithdrawAmountSufficient(grossTokenBaseUnits: bigint, priceQ64: bigint)
getDistributableAmount(amount: number)
```

## Error utilities

```typescript theme={null}
CloakError;
ShieldPoolErrors;
RootNotFoundError;
isRootNotFoundError(error);
parseError(error);
parseTransactionError(error);
```

Detailed usage: [Error Handling](/sdk/error-handling)

## Versioned exports

```typescript theme={null}
VERSION; // "1.0.0"
CLOAK_PROGRAM_ID; // mainnet program constant
```

## Protocol and service docs

* [Protocol Architecture](/protocol/architecture)
* [Shield Pool Program](/protocol/shield-pool)
* [Transaction Flows](/platform/transaction-flows)
* [Code Examples](/sdk/examples)whe