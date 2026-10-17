import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/app/lib/supabase/server";

/** Runs a loader and returns `fallback` when it throws (e.g. Supabase not configured yet). */
export async function safely<T>(loader: () => Promise<T>, fallback: NoInfer<T>): Promise<T>;
export async function safely<T>(loader: () => Promise<T>, fallback: null): Promise<T | null>;
export async function safely<T>(loader: () => Promise<T>, fallback: T | null): Promise<T | null> {
  try {
    return await loader();
  } catch (error) {
    console.error("[safely]", error);
    return fallback;
  }
}

export async function getFavoriteIds(supabase: SupabaseClient, userId: string | null | undefined): Promise<Set<string>> {
  if (!userId) return new Set();
  const { data } = await supabase.from("favorites").select("service_id").eq("user_id", userId);
  return new Set(((data as { service_id: string }[]) ?? []).map((f) => f.service_id));
}

export async function getPlatformCounts(): Promise<{ services: number; providers: number }> {
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const [s, p] = await Promise.all([
    supabase.from("services").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
    supabase.from("users").select("id", { count: "exact", head: true }).in("role", ["PROVIDER", "BOTH"]).eq("is_active", true),
  ]);
  return { services: s.count ?? 0, providers: p.count ?? 0 };
}
