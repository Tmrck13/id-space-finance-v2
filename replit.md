# ID•SPACE Finance Hub

A production-ready premium Islamic Web3 Finance Super App built for the Pi Network Ecosystem, developed by Indonesia Digital Pioneer (IDPI).

## Stack

- **Framework**: React 19 + TanStack Start (SSR)
- **Build tool**: Vite (via `@lovable.dev/vite-tanstack-config`)
- **Styling**: Tailwind CSS v4 + custom emerald/gold theme
- **UI components**: Radix UI + shadcn/ui
- **Package manager**: Bun
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod

## Running the app

```sh
bun install
bun run dev
```

The dev server runs on **port 5000**. The workflow "Start application" handles this automatically.

## Design theme

- Background: `#050806`
- Cards: `#0B1A12`
- Primary glow: `#56FF76` (emerald)
- Luxury gold: `#FFD76A`
- No blue, purple, or red

## Notes

- Originally built with [Lovable](https://lovable.dev) — live at https://id-space-finance-v1.lovable.app
- `vite.config.ts` overrides `host: "0.0.0.0"` and `port: 5000` to work correctly in the Replit environment (the Lovable sandbox detection defaults to IPv6/port 8080 which isn't supported here)

## User preferences
