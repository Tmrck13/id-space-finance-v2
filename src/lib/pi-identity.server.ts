/**
 * Pi ⇄ Supabase identity bridge — SERVER ONLY.
 *
 * After the Pi access token is validated against api.minepi.com, we map the
 * Pi account to a real Supabase auth user so that RLS, roles (user /
 * moderator / admin), wallets and the ledger all work as usual.
 *
 * - First login  → creates the auth user (which fires `handle_new_user`,
 *                  creating profile + wallet + default `user` role).
 * - Later logins → resolves the existing user by deterministic email.
 *
 * The account password is an HMAC of the Pi uid with `PI_AUTH_SIGNING_SECRET`
 * and never leaves the server: sign-in happens here and only the resulting
 * session tokens are returned to the browser.
 */
import { createHmac } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

const EMAIL_DOMAIN = "pi.idspace.local";

function piEmail(piUid: string): string {
  return `pi_${piUid.toLowerCase().replace(/[^a-z0-9]/g, "")}@${EMAIL_DOMAIN}`;
}

function piPassword(piUid: string): string {
  const secret = process.env["PI_AUTH_SIGNING_SECRET"];
  if (!secret) throw new Error("PI_AUTH_SIGNING_SECRET is not configured on the server.");
  return createHmac("sha256", secret).update(`pi:${piUid}`).digest("base64url");
}

function publishableClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export type PiSessionTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number | null;
};

export type PiIdentity = {
  userId: string;
  roles: string[];
  session: PiSessionTokens | null;
};

async function findUserByPiUid(piUid: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("pi_uid", piUid)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Ensure a Supabase auth user exists for this Pi account, then mint a session.
 * Best-effort: on failure the Pi sign-in still succeeds (degraded, no roles).
 */
export async function linkPiIdentity(params: {
  piUid: string;
  piUsername: string;
}): Promise<PiIdentity | null> {
  const email = piEmail(params.piUid);
  const password = piPassword(params.piUid);

  try {
    let userId = await findUserByPiUid(params.piUid);

    if (!userId) {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          pi_uid: params.piUid,
          username: params.piUsername,
          account_type: "user",
          auth_provider: "pi_network",
        },
      });
      if (createErr && !/already/i.test(createErr.message)) throw createErr;
      userId = created?.user?.id ?? null;

      if (!userId) {
        // Account already existed (e.g. profile row missing pi_uid) — recover it.
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
        userId = list?.users.find((u) => u.email === email)?.id ?? null;
        if (userId) {
          await supabaseAdmin.auth.admin.updateUserById(userId, { password });
        }
      }
      if (!userId) throw new Error("Could not resolve Supabase user for Pi account");

      // Keep the profile in sync with the Pi identity.
      await supabaseAdmin
        .from("profiles")
        .update({ pi_uid: params.piUid, username: params.piUsername })
        .eq("id", userId);
    } else {
      // Keep the deterministic credential valid (e.g. after secret rotation).
      await supabaseAdmin.auth.admin.updateUserById(userId, { password });
    }

    const { data: roleRows } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = (roleRows ?? []).map((r) => String(r.role));

    const { data: signIn, error: signInErr } = await publishableClient().auth.signInWithPassword({
      email,
      password,
    });
    if (signInErr) throw signInErr;

    return {
      userId,
      roles: roles.length ? roles : ["user"],
      session: signIn.session
        ? {
            access_token: signIn.session.access_token,
            refresh_token: signIn.session.refresh_token,
            expires_at: signIn.session.expires_at ?? null,
          }
        : null,
    };
  } catch (err) {
    console.error("[pi-identity] linkPiIdentity failed", err);
    return null;
  }
}
