/**
 * Notification store — real, admin-published notifications only.
 *
 * Items come from the database (active + inside their publish window) via
 * `getPublicAnnouncements`; only the per-device "read" state lives in
 * localStorage. There is intentionally NO seed data: when there are zero
 * active notifications the badge shows nothing.
 */
import { useSyncExternalStore, useCallback } from "react";

const K_READ = "idspace.notifications.read.v2";
const K_LOCAL = "idspace.notifications.local.v2";

export type Notification = {
  id: string;
  title: string;
  body: string;
  at: number;
  read: boolean;
  from: "admin" | "system";
  type: "info" | "success" | "warning";
};

export type RemoteNotification = { id: string; title: string; message: string; at: number };

type NotifState = { remote: Notification[]; local: Notification[]; readIds: string[] };

function read<T>(key: string, fb: T): T {
  if (typeof window === "undefined") return fb;
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fb; } catch { return fb; }
}
function write(key: string, v: unknown) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ }
}

let STATE: NotifState = { remote: [], local: [], readIds: [] };
let hydrated = false;
const listeners = new Set<() => void>();
let CACHE: Notification[] = [];

function recompute() {
  const readSet = new Set(STATE.readIds);
  CACHE = [...STATE.remote, ...STATE.local]
    .map((n) => ({ ...n, read: readSet.has(n.id) }))
    .sort((a, b) => b.at - a.at);
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  STATE = {
    remote: STATE.remote,
    local: read<Notification[]>(K_LOCAL, []),
    readIds: read<string[]>(K_READ, []),
  };
  hydrated = true;
  recompute();
}

function emit() {
  recompute();
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  hydrate();
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

/** Feed the store with the notifications published by admins. */
export function setRemoteNotifications(items: RemoteNotification[]) {
  const mapped: Notification[] = items.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.message,
    at: n.at,
    read: false,
    from: "admin",
    type: "info",
  }));
  const same =
    mapped.length === STATE.remote.length &&
    mapped.every((m, i) => STATE.remote[i]?.id === m.id);
  if (same) return;
  STATE = { ...STATE, remote: mapped };
  emit();
}

export function useNotifications() {
  const items = useSyncExternalStore(subscribe, () => CACHE, () => CACHE);
  const unreadCount = items.filter((n) => !n.read).length;

  const markRead = useCallback((id: string) => {
    if (STATE.readIds.includes(id)) return;
    const next = [...STATE.readIds, id];
    write(K_READ, next);
    STATE = { ...STATE, readIds: next };
    emit();
  }, []);

  const markAllRead = useCallback(() => {
    const next = [...new Set([...STATE.readIds, ...CACHE.map((n) => n.id)])];
    write(K_READ, next);
    STATE = { ...STATE, readIds: next };
    emit();
  }, []);

  const addNotification = useCallback((n: Omit<Notification, "id" | "at" | "read">) => {
    const item: Notification = { ...n, id: crypto.randomUUID(), at: Date.now(), read: false };
    const next = [item, ...STATE.local].slice(0, 50);
    write(K_LOCAL, next);
    STATE = { ...STATE, local: next };
    emit();
  }, []);

  return { items, unreadCount, markRead, markAllRead, addNotification };
}
