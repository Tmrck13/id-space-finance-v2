/**
 * Global client-side IDPoints ledger + Daily Check-In state.
 *
 * Balance ONLY reflects confirmed (status="success") transactions.
 * Pending transactions are logged but do NOT affect balance until confirmed.
 */

import { useSyncExternalStore, useCallback } from "react";

const K_BAL = "idpi.idpoints.balance";
const K_CHK = "idpi.checkin.v1";
const K_SWAP = "idpi.swap.history";
const K_TX = "idpi.wallet.tx";
const K_STAKE = "idpi.staking.v1";

/* ---------------- Types ---------------- */
export type CheckinState = {
  streak: number;
  lastClaimAt: number;
  cyclesCompleted: number;
  history: Array<{ day: number; amount: number; at: number }>;
};

export type SwapEntry = {
  id: string;
  from: string;
  to: string;
  amount: number;
  result: number;
  at: number;
};

export type TxKind =
  | "checkin"
  | "swap"
  | "purchase"
  | "deposit"
  | "withdraw"
  | "stake"
  | "unstake"
  | "stake_reward"
  | "marketplace"
  | "membership"
  | "reward";

export type TxStatus = "pending" | "success" | "cancelled" | "failed";

export type WalletTx = {
  id: string;
  kind: TxKind;
  delta: number;
  note: string;
  at: number;
  status: TxStatus;
};

export type StakeEntry = {
  id: string;
  amount: number;
  aprBps: number; // 1200 = 12% APR
  startedAt: number;
  claimedAt: number;
};

export type StakingState = {
  active: StakeEntry[];
  history: Array<{ id: string; amount: number; reward: number; endedAt: number }>;
};

const DEFAULT_CHECKIN: CheckinState = {
  streak: 0, lastClaimAt: 0, cyclesCompleted: 0, history: [],
};
const DEFAULT_STAKING: StakingState = { active: [], history: [] };

/* ---------------- Persisted read / write ---------------- */
function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function write(key: string, v: unknown) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ }
}

/* Migrate old txs that lack status field */
function migrateTxs(txs: unknown[]): WalletTx[] {
  return txs.map((t: unknown) => {
    const tx = t as Record<string, unknown>;
    return {
      id: tx.id as string ?? crypto.randomUUID(),
      kind: tx.kind as TxKind ?? "deposit",
      delta: tx.delta as number ?? 0,
      note: tx.note as string ?? "",
      at: tx.at as number ?? Date.now(),
      status: (tx.status as TxStatus) ?? "success",
    };
  });
}

/* ---------------- Singleton store ---------------- */
type State = {
  balance: number;
  checkin: CheckinState;
  swaps: SwapEntry[];
  txs: WalletTx[];
  staking: StakingState;
};

let STATE: State = {
  balance: 0,
  checkin: DEFAULT_CHECKIN,
  swaps: [],
  txs: [],
  staking: DEFAULT_STAKING,
};
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  const rawTxs = read<unknown[]>(K_TX, []);
  STATE = {
    balance: read<number>(K_BAL, 0),
    checkin: read<CheckinState>(K_CHK, DEFAULT_CHECKIN),
    swaps: read<SwapEntry[]>(K_SWAP, []),
    txs: migrateTxs(rawTxs),
    staking: read<StakingState>(K_STAKE, DEFAULT_STAKING),
  };
  hydrated = true;
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (!e.key) return;
      if (e.key === K_BAL) setState({ balance: read<number>(K_BAL, 0) });
      else if (e.key === K_CHK) setState({ checkin: read<CheckinState>(K_CHK, DEFAULT_CHECKIN) });
      else if (e.key === K_SWAP) setState({ swaps: read<SwapEntry[]>(K_SWAP, []) });
      else if (e.key === K_TX) setState({ txs: migrateTxs(read<unknown[]>(K_TX, [])) });
      else if (e.key === K_STAKE) setState({ staking: read<StakingState>(K_STAKE, DEFAULT_STAKING) });
    });
  }
}

function setState(patch: Partial<State>) {
  STATE = { ...STATE, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  hydrate();
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function useSlice<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => select(STATE),
    () => select(STATE),
  );
}

/* ---------------- Transaction log ---------------- */
function logTx(kind: TxKind, delta: number, note: string, status: TxStatus = "success"): WalletTx {
  const tx: WalletTx = { id: crypto.randomUUID(), kind, delta, note, at: Date.now(), status };
  const next = [tx, ...STATE.txs].slice(0, 200);
  write(K_TX, next);
  setState({ txs: next });
  return tx;
}

/* ---------------- Public API ---------------- */

/** IDPoints balance — only reflects confirmed transactions. */
export function useIdpointsBalance() {
  const balance = useSlice((s) => s.balance);

  const add = useCallback((delta: number, note?: string, kind: TxKind = "deposit") => {
    const next = Math.max(0, Math.round(STATE.balance + delta));
    write(K_BAL, next);
    setState({ balance: next });
    if (delta !== 0) logTx(kind, delta, note ?? (delta > 0 ? "Credit" : "Debit"));
  }, []);

  const set = useCallback((v: number) => {
    const next = Math.max(0, Math.round(v));
    write(K_BAL, next);
    setState({ balance: next });
  }, []);

  return { balance, add, set };
}

/** Transaction history — shared. */
export function useTransactions() {
  const txs = useSlice((s) => s.txs);
  const clear = useCallback(() => { write(K_TX, []); setState({ txs: [] }); }, []);
  return { txs, clear };
}

/* ---------------- Deposit (secure pending flow) ---------------- */
/**
 * Step 1: Create a PENDING deposit — does NOT credit balance.
 * Returns the transaction ID for later confirmation.
 */
export function createPendingDeposit(amount: number, note: string): string {
  hydrate();
  const tx = logTx("deposit", amount, note, "pending");
  return tx.id;
}

/**
 * Step 2: Confirm a pending deposit — credits balance and marks SUCCESS.
 */
export function confirmDeposit(txId: string): boolean {
  hydrate();
  const tx = STATE.txs.find((t) => t.id === txId && t.status === "pending" && t.kind === "deposit");
  if (!tx) return false;
  const nb = Math.max(0, Math.round(STATE.balance + tx.delta));
  write(K_BAL, nb);
  const updatedTxs = STATE.txs.map((t) => t.id === txId ? { ...t, status: "success" as TxStatus } : t);
  write(K_TX, updatedTxs);
  setState({ balance: nb, txs: updatedTxs });
  return true;
}

/**
 * Cancel a pending deposit.
 */
export function cancelDeposit(txId: string): void {
  hydrate();
  const updatedTxs = STATE.txs.map((t) =>
    t.id === txId && t.status === "pending" ? { ...t, status: "cancelled" as TxStatus } : t
  );
  write(K_TX, updatedTxs);
  setState({ txs: updatedTxs });
}

/* ---------------- Withdraw (secure pending flow) ---------------- */
/**
 * Step 1: Create a PENDING withdraw — debits balance immediately.
 * Returns txId or null if insufficient balance.
 */
export function createPendingWithdraw(amount: number, note: string): string | null {
  hydrate();
  if (amount <= 0 || amount > STATE.balance) return null;
  const nb = Math.max(0, Math.round(STATE.balance - amount));
  write(K_BAL, nb);
  const tx = logTx("withdraw", -amount, note, "pending");
  setState({ balance: nb });
  return tx.id;
}

/**
 * Step 2a: Approve withdraw — marks as SUCCESS.
 */
export function approveWithdraw(txId: string): void {
  hydrate();
  const updatedTxs = STATE.txs.map((t) =>
    t.id === txId && t.kind === "withdraw" ? { ...t, status: "success" as TxStatus } : t
  );
  write(K_TX, updatedTxs);
  setState({ txs: updatedTxs });
}

/**
 * Step 2b: Reject withdraw — refunds balance and marks as FAILED.
 */
export function rejectWithdraw(txId: string): void {
  hydrate();
  const tx = STATE.txs.find((t) => t.id === txId && t.kind === "withdraw");
  if (!tx) return;
  const nb = Math.max(0, Math.round(STATE.balance + Math.abs(tx.delta)));
  write(K_BAL, nb);
  const updatedTxs = STATE.txs.map((t) =>
    t.id === txId ? { ...t, status: "failed" as TxStatus } : t
  );
  write(K_TX, updatedTxs);
  setState({ balance: nb, txs: updatedTxs });
}

/* ---------------- Daily Check-In ---------------- */
const DAY_MS = 24 * 60 * 60 * 1000;

export function useCheckin() {
  const state = useSlice((s) => s.checkin);

  const persist = useCallback((next: CheckinState) => {
    write(K_CHK, next);
    setState({ checkin: next });
  }, []);

  const evaluate = useCallback(() => {
    const s = STATE.checkin;
    const now = Date.now();
    const delta = now - s.lastClaimAt;
    if (!s.lastClaimAt) return { canClaim: true, nextDay: 1, resets: false, msLeft: 0 };
    if (s.streak >= 7) {
      const msLeft = Math.max(0, DAY_MS - delta);
      return { canClaim: msLeft === 0, nextDay: 1, resets: true, msLeft };
    }
    if (delta > 2 * DAY_MS) return { canClaim: true, nextDay: 1, resets: true, msLeft: 0 };
    if (delta < DAY_MS) return { canClaim: false, nextDay: s.streak + 1, resets: false, msLeft: DAY_MS - delta };
    return { canClaim: true, nextDay: s.streak + 1, resets: false, msLeft: 0 };
  }, []);

  const claim = useCallback((amount: number) => {
    const info = evaluate();
    if (!info.canClaim) return { ok: false as const, reason: "cooldown" };
    const day = info.nextDay;
    const startingStreak = info.resets ? 0 : STATE.checkin.streak;
    const nextStreak = startingStreak + 1;
    const cyclesCompleted = nextStreak === 7
      ? STATE.checkin.cyclesCompleted + 1
      : STATE.checkin.cyclesCompleted;
    persist({
      streak: nextStreak,
      lastClaimAt: Date.now(),
      cyclesCompleted,
      history: [{ day, amount, at: Date.now() }, ...STATE.checkin.history].slice(0, 30),
    });
    // credit balance + record transaction
    const nextBal = Math.max(0, Math.round(STATE.balance + amount));
    write(K_BAL, nextBal);
    setState({ balance: nextBal });
    logTx("checkin", amount, `Daily check-in · Day ${day}`);
    return { ok: true as const, day, amount, cycleCompleted: nextStreak === 7 };
  }, [evaluate, persist]);

  return { state, evaluate, claim };
}

/* ---------------- Swap history ---------------- */
export function useSwapHistory() {
  const items = useSlice((s) => s.swaps);
  const add = useCallback((entry: Omit<SwapEntry, "id" | "at">) => {
    const e: SwapEntry = { ...entry, id: crypto.randomUUID(), at: Date.now() };
    const next = [e, ...STATE.swaps].slice(0, 50);
    write(K_SWAP, next);
    setState({ swaps: next });
    // If IDPoints leaves, debit balance; if IDPoints comes in, credit it.
    if (entry.from === "IDPOINTS") {
      const nb = Math.max(0, Math.round(STATE.balance - entry.amount));
      write(K_BAL, nb); setState({ balance: nb });
      logTx("swap", -entry.amount, `Swap → ${entry.to}`);
    } else if (entry.to === "IDPOINTS") {
      const nb = Math.max(0, Math.round(STATE.balance + entry.result));
      write(K_BAL, nb); setState({ balance: nb });
      logTx("swap", entry.result, `Swap ← ${entry.from}`);
    }
  }, []);
  const clear = useCallback(() => { write(K_SWAP, []); setState({ swaps: [] }); }, []);
  return { items, add, clear };
}

/* ---------------- Staking ---------------- */
const APR_BPS = 1200; // 12% APR demo
const YEAR_MS = 365 * DAY_MS;

export function computeStakeReward(stake: StakeEntry, now = Date.now()) {
  const elapsed = Math.max(0, now - stake.claimedAt);
  return Math.floor((stake.amount * (stake.aprBps / 10000) * elapsed) / YEAR_MS);
}

export function useStaking() {
  const staking = useSlice((s) => s.staking);
  const balance = useSlice((s) => s.balance);

  const persist = useCallback((next: StakingState) => {
    write(K_STAKE, next);
    setState({ staking: next });
  }, []);

  const stake = useCallback((amount: number) => {
    if (amount <= 0) return { ok: false as const, reason: "amount" };
    if (amount > STATE.balance) return { ok: false as const, reason: "balance" };
    const nb = STATE.balance - amount;
    write(K_BAL, nb); setState({ balance: nb });
    logTx("stake", -amount, "Stake IDPoints");
    const entry: StakeEntry = {
      id: crypto.randomUUID(),
      amount, aprBps: APR_BPS,
      startedAt: Date.now(), claimedAt: Date.now(),
    };
    persist({ ...STATE.staking, active: [entry, ...STATE.staking.active] });
    return { ok: true as const };
  }, [persist]);

  const claim = useCallback((id: string) => {
    const entry = STATE.staking.active.find((s) => s.id === id);
    if (!entry) return { ok: false as const };
    const reward = computeStakeReward(entry);
    if (reward <= 0) return { ok: false as const, reason: "no_reward" };
    const nb = STATE.balance + reward;
    write(K_BAL, nb); setState({ balance: nb });
    logTx("stake_reward", reward, "Staking reward");
    persist({
      ...STATE.staking,
      active: STATE.staking.active.map((s) => s.id === id ? { ...s, claimedAt: Date.now() } : s),
    });
    return { ok: true as const, reward };
  }, [persist]);

  const unstake = useCallback((id: string) => {
    const entry = STATE.staking.active.find((s) => s.id === id);
    if (!entry) return { ok: false as const };
    const reward = computeStakeReward(entry);
    const nb = STATE.balance + entry.amount + reward;
    write(K_BAL, nb); setState({ balance: nb });
    logTx("unstake", entry.amount + reward,
      reward > 0 ? `Unstake + reward` : "Unstake");
    persist({
      active: STATE.staking.active.filter((s) => s.id !== id),
      history: [
        { id: entry.id, amount: entry.amount, reward, endedAt: Date.now() },
        ...STATE.staking.history,
      ].slice(0, 50),
    });
    return { ok: true as const, reward };
  }, [persist]);

  return { staking, balance, apr: APR_BPS / 100, stake, claim, unstake };
}

/** Optional escape hatch for pages that need to spend IDPoints directly. */
export function spendIdpoints(amount: number, note: string, kind: TxKind = "purchase"): boolean {
  hydrate();
  if (amount <= 0 || amount > STATE.balance) return false;
  const nb = STATE.balance - amount;
  write(K_BAL, nb); setState({ balance: nb });
  logTx(kind, -amount, note);
  return true;
}
