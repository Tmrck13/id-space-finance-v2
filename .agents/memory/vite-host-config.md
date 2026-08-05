---
name: Vite host config for Replit
description: How to fix the Lovable vite plugin's default host/port when running on Replit
---

The `@lovable.dev/vite-tanstack-config` plugin defaults to IPv6 (`::`) on port 8080 for sandbox detection, which fails with `EAFNOSUPPORT` on Replit.

**Fix:** Pass server overrides in vite.config.ts:
```ts
export default defineConfig({
  vite: {
    server: {
      host: "0.0.0.0",
      port: 5000,
      strictPort: true,
      allowedHosts: "all",  // also prevents "Blocked request" host errors
    },
  },
});
```

**Why:** Replit's proxy uses mTLS and the preview iframe sends requests from a different origin. IPv6 is not supported. `allowedHosts: "all"` is needed because the Replit dev domain doesn't match `localhost`.
