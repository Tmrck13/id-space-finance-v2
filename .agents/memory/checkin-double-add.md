---
name: Check-in double-add bug
description: The useCheckin().claim() function already credits balance; calling add() after it doubles the reward
---

In `idpoints-store.ts`, `useCheckin().claim(amount)` internally:
1. Updates the streak state
2. Credits `STATE.balance += amount`
3. Logs the transaction

**Bug pattern (DO NOT DO THIS):**
```ts
const res = claim(nextReward);
if (res.ok) {
  add(res.amount); // ← doubles the credit!
}
```

**Correct pattern:**
```ts
const res = claim(nextReward);
if (res.ok) {
  toast.success(`+${res.amount} IDPoints`);
  // do NOT call add() — claim() already handled the balance
}
```

**Why:** The checkin.tsx originally had this bug, introduced during Lovable development. The fix is to remove the `add()` call entirely.
