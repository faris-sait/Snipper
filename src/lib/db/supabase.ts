import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

/**
 * Returns the service-role Supabase client, or `null` when persistence isn't
 * configured (env vars missing). Callers must handle the null case so the
 * app stays usable in local-only mode — the audit engine is the source of
 * value, persistence is the share-link enabler.
 */
export function getSupabaseService(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    cached = null;
    return null;
  }
  cached = createClient(url, key, {
    auth: {
      // Service-role calls have no user session — opt out of session machinery.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cached;
}

export function isPersistenceConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
