import { Shield } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export interface LegalSection {
  icon: ReactNode;
  title: string;
  body: string;
}

export function LegalPage({
  metaTitle,
  title,
  subtitle,
  updated,
  sections,
}: {
  metaTitle: string;
  title: string;
  subtitle: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-screen text-white" style={{ fontFamily: "Inter, system-ui" }}>
      <div className="mx-auto max-w-3xl px-4 py-8 lg:px-6 lg:py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs tracking-widest text-emerald-200/70 transition hover:text-emerald-100"
        >
          ← Back to Home
        </Link>

        <div className="mt-6 glass-card p-6 lg:p-8">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full gold-border">
              <Shield className="h-5 w-5" style={{ color: "#FFD76A" }} />
            </span>
            <div>
              <h1 className="font-display text-2xl tracking-[.12em] gold-shimmer">{title}</h1>
              <p className="text-[11px] tracking-widest text-emerald-200/60">{metaTitle}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-emerald-50/80">{subtitle}</p>
          <p className="mt-2 text-[11px] text-emerald-200/50">Last updated: {updated}</p>
        </div>

        <div className="mt-6 space-y-4">
          {sections.map((s) => (
            <section key={s.title} className="glass-card p-5 lg:p-6">
              <div className="mb-3 flex items-center gap-2">
                <span style={{ color: "#56FF76" }}>{s.icon}</span>
                <h2 className="text-sm font-semibold tracking-[.2em] gold-text uppercase">{s.title}</h2>
              </div>
              <p className="text-sm leading-7 text-emerald-50/85">{s.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-8 text-center text-[11px] text-emerald-200/50">
          This page is maintained by IDPI to answer common questions about {metaTitle.toLowerCase()}.
        </div>
      </div>
    </div>
  );
}
