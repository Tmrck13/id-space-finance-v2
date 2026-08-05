/**
 * Global client-side IDPoints ledger + Daily Check-In state.
 *
 * Uses a module-level singleton store with subscribers so that every
 * component (Home, Wallet, Swap, Marketplace, Check-In, Staking…)
 * observes the exact same balance and updates instantly on any change
 * inside the same tab. Persisted to localStorage — swap for a Supabase-
 * backed adapter later without touching call sites.
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
  | "stake_reward";

export type WalletTx = {
  id: string;
  kind: TxKind;
  delta: number;
  note: string;
  at: number;
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
  STATE = {
    balance: read<number>(K_BAL, 0),
    checkin: read<CheckinState>(K_CHK, DEFAULT_CHECKIN),
    swaps: read<SwapEntry[]>(K_SWAP, []),
    txs: read<WalletTx[]>(K_TX, []),
    staking: read<StakingState>(K_STAKE, DEFAULT_STAKING),
  };
  hydrated = true;
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (!e.key) return;
      if (e.key === K_BAL) setState({ balance: read<number>(K_BAL, 0) });
      else if (e.key === K_CHK) setState({ checkin: read<CheckinState>(K_CHK, DEFAULT_CHECKIN) });
      else if (e.key === K_SWAP) setState({ swaps: read<SwapEntry[]>(K_SWAP, []) });
      else if (e.key === K_TX) setState({ txs: read<WalletTx[]>(K_TX, []) });
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
function logTx(kind: TxKind, delta: number, note: string) {
  const tx: WalletTx = { id: crypto.randomUUID(), kind, delta, note, at: Date.now() };
  const next = [tx, ...STATE.txs].slice(0, 200);
  write(K_TX, next);
  setState({ txs: next });
}

/* ---------------- Public API ---------------- */

/** IDPoints balance — shared across every consumer. */
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
    // credit balance + record transaction atomically
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
export function spendIdpoints(amount: number, note: string): boolean {
  hydrate();
  if (amount <= 0 || amount > STATE.balance) return false;
  const nb = STATE.balance - amount;
  write(K_BAL, nb); setState({ balance: nb });
  logTx("purchase", -amount, note);
  return true;
}