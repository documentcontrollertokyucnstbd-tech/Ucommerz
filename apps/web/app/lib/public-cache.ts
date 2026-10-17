import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import { createClient as createJsClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Public, non-personalised data (categories, featured services/providers, counts) is identical for every
 * visitor, so it is read with a cookie-less anon client and cached for a short time. That removes several
 * database round trips from the home / browse / category pages.
 */
export const PUBLIC_TAG = "public-data";

function anonClient(): SupabaseClient {
  return createJsClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** Cache `loader` for `revalidate` seconds. Errors are thrown (and therefore never cached). */
export function cachedPublic<T>(keyParts: string[], loader: (db: SupabaseClient) => Promise<T>, revalidate = 60): () => Promise<T> {
  return unstable_cache(() => loader(anonClient()), ["public", ...keyParts], { revalidate, tags: [PUBLIC_TAG] });
}

/** Call after an admin/provider change so the home page etc. show it immediately. */
export function bustPublicCache() {
  try {
    revalidateTag(PUBLIC_TAG);
  } catch {
    /* outside a request context (scripts/tests) */
  }
}
