import { createFileRoute } from "@tanstack/react-router";
import { RewardStore } from "@/lib/pi-store.server";

/** GET /api/public/pi/rewards?userUid=... */
export const Route = createFileRoute("/api/public/pi/rewards")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const userUid = url.searchParams.get("userUid");
        if (!userUid) {
          return Response.json({ ok: false, error: "userUid required" }, { status: 400 });
        }
        return Response.json({ ok: true, balance: RewardStore.getBalance(userUid) });
      },
    },
  },
});