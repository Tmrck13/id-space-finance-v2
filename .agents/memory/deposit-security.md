---
name: Deposit security pattern
description: Secure deposit flow that prevents crediting balance before payment verification
---

The deposit flow uses a three-step pattern in `idpoints-store.ts`:

1. `createPendingDeposit(amount, note)` → logs a tx with `status: "pending"`, returns txId. Does NOT credit balance.
2. `confirmDeposit(txId)` → sets tx status to "success", credits balance. Call only after payment verified.
3. `cancelDeposit(txId)` → sets tx status to "cancelled". Call if user cancels.

**Why:** The original code called `add(1000, "Testnet deposit", "deposit")` directly, meaning users could get free IDPoints by just clicking the button without paying.

**How to apply:** `WalletTx` now has a `status: TxStatus` field ("pending"|"success"|"cancelled"|"failed"). Old txs without status are migrated to "success" on hydrate. The wallet balance is stored separately (not computed from txs), so only the confirm step actually affects balance.
