import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client. BYPASSES Row Level Security.
 * Server-only: cron jobs, reminders, audit logging and other trusted work.
 * Never import this from a Client Component.
 */
export function hasServiceRole(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to apps/web/.env.local (Supabase → Project Settings → API).",
    );
  }
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
