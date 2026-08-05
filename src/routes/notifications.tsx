import { createFileRoute } from "@tanstack/react-router";
import { Bell, Check, CheckCheck, Info, AlertTriangle, Sparkles } from "lucide-react";
import { AppShell, SectionTitle } from "@/components/idspace/shell";
import { useNotifications } from "@/lib/notification-store";
import { useSettings, useTap } from "@/lib/app-settings";
import type { Notification } from "@/lib/notification-store";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
  head: () => ({
    meta: [
      { title: "Notifications — IDPI" },
      { name: "description", content: "System and admin notifications for ID·SPACE Finance." },
    ],
  }),
});

function NotificationsPage() {
  const { items, unreadCount, markRead, markAllRead } = useNotifications();
  const { t } = useSettings();
  const tap = useTap();

  return (
    <AppShell active="Alerts">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 text-center">
          <div className="text-[11px] tracking-[.4em] gold-text uppercase">IDPI • System</div>
          <h1 className="mt-1 font-display text-3xl gold-shimmer">{t("notifications.title")}</h1>
        </div>

        <div className="glass-card p-4">
          <SectionTitle
            icon={<Bell className="h-4 w-4" />}
            title={t("notifications.title")}
            right={
              unreadCount > 0 ? (
                <button
                  onClick={() => { tap(); markAllRead(); }}
                  className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] gold-border gold-text transition hover:-translate-y-0.5"
                >
                  <CheckCheck className="h-3 w-3" />
                  {t("notifications.markAllRead")}
                </button>
              ) : null
            }
          />

          {items.length === 0 ? (
            <div
              className="rounded-lg p-8 text-center text-sm text-emerald-100/50"
              style={{ background: "rgba(5,8,6,.5)", border: "1px dashed rgba(255,215,106,.2)" }}
            >
              <Bell className="mx-auto mb-2 h-8 w-8 opacity-30" style={{ color: "#FFD76A" }} />
              <p>{t("notifications.empty")}</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((n) => (
                <NotifItem key={n.id} n={n} onRead={() => { tap(); markRead(n.id); }} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function NotifItem({ n, onRead }: { n: Notification; onRead: () => void }) {
  const typeColor = n.type === "success" ? "#56FF76" : n.type === "warning" ? "#FF9F76" : "#7CC3FF";
  const TypeIcon = n.type === "success" ? Sparkles : n.type === "warning" ? AlertTriangle : Info;

  return (
    <li
      className="flex items-start gap-3 rounded-xl px-4 py-3 transition"
      style={{
        background: n.read ? "rgba(5,8,6,.4)" : "rgba(11,26,18,.9)",
        border: `1px solid ${n.read ? "rgba(255,215,106,.1)" : "rgba(255,215,106,.35)"}`,
        boxShadow: n.read ? undefined : "0 0 12px rgba(86,255,118,.08)",
      }}
    >
      <div
        className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg"
        style={{ background: "rgba(5,8,6,.8)", border: `1px solid ${typeColor}40` }}
      >
        <TypeIcon className="h-4 w-4" style={{ color: typeColor }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm font-medium ${n.read ? "text-white/70" : "text-white"}`}>
            {n.title}
          </p>
          {!n.read && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
          )}
        </div>
        <p className="mt-0.5 text-xs text-emerald-100/60 leading-relaxed">{n.body}</p>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[10px] text-emerald-100/40">
            {n.from === "admin" ? "Admin" : "System"} · {new Date(n.at).toLocaleString()}
          </span>
          {!n.read && (
            <button
              onClick={onRead}
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] transition hover:-translate-y-0.5"
              style={{ border: "1px solid rgba(86,255,118,.4)", color: "#56FF76" }}
            >
              <Check className="h-3 w-3" />
              Mark read
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
