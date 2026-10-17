import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityLog, LogActivityInput } from "@ucommerz/shared";
import { createClient } from "@/app/lib/supabase/server";

/**
 * Writes a row to activity_logs for the given user.
 * Uses the caller's session (RLS: user can insert own rows). Never throws.
 */
export async function logActivity(input: LogActivityInput, client?: SupabaseClient): Promise<void> {
  try {
    const supabase = client ?? ((await createClient()) as unknown as SupabaseClient);
    const { error } = await supabase.from("activity_logs").insert({
      user_id: input.userId,
      action_type: input.action,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      description: input.description ?? null,
      metadata: input.metadata ?? {},
    });
    if (error) console.error("[activity-service]", error.message);
  } catch (error) {
    console.error("[activity-service]", error);
  }
}

export async function fetchActivity(
  supabase: SupabaseClient,
  userId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<ActivityLog[]> {
  const limit = options.limit ?? 30;
  const offset = options.offset ?? 0;
  const { data } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  return (data as ActivityLog[]) ?? [];
}
