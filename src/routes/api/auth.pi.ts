import { createFileRoute } from "@tanstack/react-router";

/**
 * POST /api/auth/pi  { accessToken }
 *
 * 1. Validates the Pi access token against the official Pi Platform API.
 * 2. Records the validated Pi session.
 * 3. Links / creates the matching Supabase account and returns its session
 *    tokens + roles so the browser can persist a real authenticated session.
 *
 * Secrets are read from the encrypted backend store (admin-managed) with an
 * environment fallback. They are never sent to the client.
 */
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
        if (!accessToken || typeof accessToken !== "string" || accessToken.length > 4096) {
          return Response.json({ ok: false, error: "Missing accessToken" }, { status: 400 });
        }

        const { getServerSecret } = await import("@/lib/app-secrets.server");
        const validationKey = await getServerSecret("PI_VALIDATION_KEY");
        if (!validationKey) {
          return Response.json(
            { ok: false, error: "Server not configured (PI_VALIDATION_KEY missing)" },
            { status: 503 },
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

          const { recordPiAuthSession } = await import("@/lib/pi-db.server");
          const { linkPiIdentity } = await import("@/lib/pi-identity.server");

          const identity = await linkPiIdentity({ piUid: user.uid, piUsername: user.username });
          await recordPiAuthSession({ piUid: user.uid, piUsername: user.username });

          return Response.json({
            ok: true,
            user: { uid: user.uid, username: user.username },
            roles: identity?.roles ?? [],
            session: identity?.session ?? null,
            network: sandbox ? "testnet" : "mainnet",
            validatedAt: new Date().toISOString(),
          });
        } catch (err) {
          const msg =
            err instanceof Error && err.name === "AbortError"
              ? "Network timeout contacting Pi Network"
              : "Failed to validate Pi access token";
          return Response.json({ ok: false, error: msg }, { status: 502 });
        }
      },
    },
  },
});
