/**
 * Notification store — Admin/System-only notifications.
 * Badge only shows when unread > 0. Mark-as-read updates instantly.
 */
import { useSyncExternalStore, useCallback } from "react";

const K_NOTIF = "idspace.notifications.v1";

export type Notification = {
  id: string;
  title: string;
  body: string;
  at: number;
  read: boolean;
  from: "admin" | "system";
  type: "info" | "success" | "warning";
};

type NotifState = { items: Notification[] };

function read<T>(key: string, fb: T): T {
  if (typeof window === "undefined") return fb;
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fb; } catch { return fb; }
}
function write(key: string, v: unknown) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ }
}

// Seed some initial admin notifications if store is empty
const SEED: Notification[] = [
  {
    id: "sys-001",
    title: "Welcome to ID·SPACE Finance",
    body: "Thank you for joining the First Islamic Web3 Finance Super App. Complete your Daily Check-In to earn IDPoints!",
    at: Date.now() - 3600000,
    read: false,
    from: "system",
    type: "info",
  },
  {
    id: "sys-002",
    title: "IDPoints Staking Available",
    body: "Earn 12% APR by staking your IDPoints. Go to the Staking page to start growing your balance.",
    at: Date.now() - 7200000,
    read: false,
    from: "admin",
    type: "success",
  },
];

let STATE: NotifState = { items: [] };
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  const stored = read<Notification[]>(K_NOTIF, []);
  STATE = { items: stored.length > 0 ? stored : SEED };
  if (stored.length === 0) write(K_NOTIF, SEED);
  hydrated = true;
  window.addEventListener("storage", (e) => {
    if (e.key === K_NOTIF) {
      STATE = { items: read<Notification[]>(K_NOTIF, []) };
      listeners.forEach((l) => l());
    }
  });
}

function setState(patch: Partial<NotifState>) {
  STATE = { ...STATE, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  hydrate();
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function useNotifications() {
  const items = useSyncExternalStore(subscribe, () => STATE.items, () => STATE.items);

  const unreadCount = items.filter((n) => !n.read).length;

  const markRead = useCallback((id: string) => {
    const next = STATE.items.map((n) => n.id === id ? { ...n, read: true } : n);
    write(K_NOTIF, next);
    setState({ items: next });
  }, []);

  const markAllRead = useCallback(() => {
    const next = STATE.items.map((n) => ({ ...n, read: true }));
    write(K_NOTIF, next);
    setState({ items: next });
  }, []);

  const addNotification = useCallback((n: Omit<Notification, "id" | "at" | "read">) => {
    const item: Notification = { ...n, id: crypto.randomUUID(), at: Date.now(), read: false };
    const next = [item, ...STATE.items].slice(0, 50);
    write(K_NOTIF, next);
    setState({ items: next });
  }, []);

  return { items, unreadCount, markRead, markAllRead, addNotification };
}
