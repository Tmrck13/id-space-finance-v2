import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/pi")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let accessToken: string | undefined;
        try {
          const body = (await request.json()) as { accessToken?: string };
          accessToken = body?.accessToken;
        } catch {
          return Response.json({ ok: false, error: "Invalid request body" }, { status: 400 });
        }
        if (!accessToken || typeof accessToken !== "string") {
          return Response.json({ ok: false, error: "Missing accessToken" }, { status: 400 });
        }
        const validationKey = process.env.PI_VALIDATION_KEY;
        if (!validationKey) {
          return Response.json(
            { ok: false, error: "Server not configured (PI_VALIDATION_KEY missing)" },
            { status: 500 },
          );
        }
        const sandbox = String(process.env.PI_SANDBOX ?? "true").toLowerCase() === "true";
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10_000);
          const res = await fetch("https://api.minepi.com/v2/me", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "X-Pi-Validation-Key": validationKey,
            },
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (!res.ok) {
            return Response.json(
              { ok: false, error: `Pi validation failed (${res.status})` },
              { status: 401 },
            );
          }
          const user = (await res.json()) as { uid?: string; username?: string };
          if (!user?.uid || !user?.username) {
            return Response.json({ ok: false, error: "Invalid Pi user payload" }, { status: 401 });
          }
          return Response.json({
            ok: true,
            user: { uid: user.uid, username: user.username },
            network: sandbox ? "testnet" : "mainnet",
            validatedAt: new Date().toISOString(),
          });
        } catch (err) {
          const msg = err instanceof Error && err.name === "AbortError"
            ? "Network timeout contacting Pi Network"
            : "Failed to validate Pi access token";
          return Response.json({ ok: false, error: msg }, { status: 502 });
        }
      },
    },
  },
});