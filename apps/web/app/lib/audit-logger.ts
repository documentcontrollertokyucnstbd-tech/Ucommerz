import "server-only";
import { headers } from "next/headers";
import { createAdminClient, hasServiceRole } from "@/app/lib/supabase/admin";
import { createClient } from "@/app/lib/supabase/server";
import { getClientIp } from "@/app/lib/rate-limit";

export type AuditInput = {
  adminId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
};

/**
 * Records an administrative action in admin_logs.
 * Prefers the service role (insert is restricted by RLS otherwise); falls back to the
 * admin's own session, which RLS also permits. Never throws: auditing must not break the action.
 */
export async function logAdminAction(input: AuditInput): Promise<void> {
  try {
    const h = await headers();
    const row = {
      admin_id: input.adminId,
      action: input.action,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      details: input.details ?? {},
      ip_address: getClientIp(h),
      user_agent: h.get("user-agent")?.slice(0, 300) ?? null,
    };
    const client = hasServiceRole() ? createAdminClient() : await createClient();
    const { error } = await client.from("admin_logs").insert(row);
    if (error) console.error("[audit-logger]", error.message);
  } catch (error) {
    console.error("[audit-logger]", error);
  }
}
