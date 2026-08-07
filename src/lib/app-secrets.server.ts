/**
 * Encrypted backend secret store — SERVER ONLY.
 *
 * Secrets (PI_NETWORK_API_KEY, PI_VALIDATION_KEY, ...) are stored in
 * `public.app_secrets` as AES-256-GCM ciphertext. The master key comes from
 * the platform secret `APP_SECRETS_ENC_KEY` and never leaves the server.
 *
 * Resolution order for a secret value:
 *   1. `app_secrets` row (admin-managed, encrypted)
 *   2. process.env fallback (bootstrap / local dev)
 *
 * The table has RLS enabled with NO policies, so only the service role can
 * reach it. Plaintext is never returned to the frontend — the admin UI only
 * receives masked metadata (see `describeSecrets`).
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const MANAGED_SECRET_KEYS = ["PI_NETWORK_API_KEY", "PI_VALIDATION_KEY"] as const;
export type ManagedSecretKey = (typeof MANAGED_SECRET_KEYS)[number];

const ALGO = "aes-256-gcm";
const CACHE_TTL_MS = 30_000;

type CacheEntry = { value: string | null; at: number };
const g = globalThis as unknown as { __idpiSecretCache?: Map<string, CacheEntry> };
if (!g.__idpiSecretCache) g.__idpiSecretCache = new Map();
const cache = g.__idpiSecretCache;

function masterKey(): Buffer {
  const raw = process.env["APP_SECRETS_ENC_KEY"];
  if (!raw) throw new Error("APP_SECRETS_ENC_KEY is not configured on the server.");
  return createHash("sha256").update(raw).digest();
}

function encrypt(plaintext: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, masterKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    auth_tag: cipher.getAuthTag().toString("base64"),
  };
}

function decrypt(row: { ciphertext: string; iv: string; auth_tag: string }): string {
  const decipher = createDecipheriv(ALGO, masterKey(), Buffer.from(row.iv, "base64"));
  decipher.setAuthTag(Buffer.from(row.auth_tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(row.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** Mask a secret for display: keeps a short prefix/suffix only. */
export function maskSecret(value: string): string {
  if (value.length <= 8) return "•".repeat(value.length);
  return `${value.slice(0, 4)}${"•".repeat(Math.min(12, value.length - 8))}${value.slice(-4)}`;
}

/** Basic shape validation before anything is persisted. */
export function validateSecret(key: ManagedSecretKey, value: string): string | null {
  const v = value.trim();
  if (!v) return "Value is required.";
  if (v.length < 16) return "Value looks too short to be a valid key.";
  if (v.length > 512) return "Value is too long.";
  if (/\s/.test(v)) return "Value must not contain whitespace.";
  if (key === "PI_VALIDATION_KEY" && !/^[A-Za-z0-9._-]+$/.test(v)) {
    return "Validation key contains unexpected characters.";
  }
  return null;
}

/** Read a secret (DB first, env fallback). Cached briefly to avoid hot-path reads. */
export async function getServerSecret(key: string): Promise<string | null> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  let value: string | null = null;
  try {
    const { data } = await supabaseAdmin
      .from("app_secrets")
      .select("ciphertext, iv, auth_tag")
      .eq("key", key)
      .maybeSingle();
    if (data) value = decrypt(data);
  } catch (err) {
    console.error(`[app-secrets] failed to read ${key}`, err);
  }
  if (!value) value = process.env[key] ?? null;

  cache.set(key, { value, at: Date.now() });
  return value;
}

/** Store/replace a secret. Returns the masked value for the audit log. */
export async function setServerSecret(
  key: ManagedSecretKey,
  value: string,
  updatedBy: string,
): Promise<{ masked: string }> {
  const problem = validateSecret(key, value);
  if (problem) throw new Error(problem);
  const trimmed = value.trim();
  const enc = encrypt(trimmed);

  const { error } = await supabaseAdmin.from("app_secrets").upsert(
    {
      key,
      ...enc,
      hint: maskSecret(trimmed),
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) throw new Error(error.message);

  cache.delete(key);
  return { masked: maskSecret(trimmed) };
}

export async function deleteServerSecret(key: ManagedSecretKey): Promise<void> {
  const { error } = await supabaseAdmin.from("app_secrets").delete().eq("key", key);
  if (error) throw new Error(error.message);
  cache.delete(key);
}

/** Frontend-safe status of the managed secrets: never plaintext. */
export async function describeSecrets(): Promise<
  Array<{
    key: ManagedSecretKey;
    configured: boolean;
    source: "database" | "environment" | "missing";
    hint: string | null;
    updatedAt: string | null;
  }>
> {
  const { data } = await supabaseAdmin
    .from("app_secrets")
    .select("key, hint, updated_at")
    .in("key", MANAGED_SECRET_KEYS as unknown as string[]);
  const rows = new Map((data ?? []).map((r) => [r.key, r]));

  return MANAGED_SECRET_KEYS.map((key) => {
    const row = rows.get(key);
    if (row) {
      return {
        key,
        configured: true,
        source: "database" as const,
        hint: row.hint ?? null,
        updatedAt: row.updated_at,
      };
    }
    const env = process.env[key];
    return {
      key,
      configured: !!env,
      source: env ? ("environment" as const) : ("missing" as const),
      hint: env ? maskSecret(env) : null,
      updatedAt: null,
    };
  });
}
