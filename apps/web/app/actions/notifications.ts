"use server";

import { z } from "zod";
import { requireUser } from "@/app/lib/guards";
import { ActionError, ok, parseInput, safeAction, type ActionResult } from "@/app/lib/action";

/** Mark specific notifications (or all, when no ids are given) as read. */
export async function markNotificationsReadAction(ids?: string[]): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireUser();
    const list = ids ? parseInput(z.array(z.string().uuid()).max(100), ids) : null;
    let q = supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", profile.id)
      .eq("is_read", false);
    if (list) q = q.in("id", list);
    const { error } = await q;
    if (error) throw new ActionError(error.message);
    return ok();
  });
}

export async function clearNotificationsAction(): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireUser();
    const { error } = await supabase.from("notifications").delete().eq("user_id", profile.id).eq("is_read", true);
    if (error) throw new ActionError(error.message);
    return ok("Cleared read notifications.");
  });
}
