"use server";

import { reportSchema } from "@ucommerz/shared";
import { requireUser } from "@/app/lib/guards";
import { ActionError, limitAction, ok, parseInput, safeAction, type ActionResult } from "@/app/lib/action";
import { logActivity } from "@/app/lib/activity-service";

export async function submitReportAction(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    await limitAction("report", 8, 10 * 60_000);
    const { profile, supabase } = await requireUser();
    const v = parseInput(reportSchema, input);

    if (v.target_type === "USER" && v.target_id === profile.id) throw new ActionError("You cannot report yourself.");

    const { data: dup } = await supabase
      .from("reports")
      .select("id")
      .eq("reporter_id", profile.id)
      .eq("target_type", v.target_type)
      .eq("target_id", v.target_id)
      .in("status", ["PENDING", "UNDER_REVIEW"])
      .maybeSingle();
    if (dup) throw new ActionError("You have already reported this. Our team is reviewing it.");

    const { error } = await supabase.from("reports").insert({
      reporter_id: profile.id,
      target_type: v.target_type,
      target_id: v.target_id,
      reason: v.reason,
      description: v.description || null,
    });
    if (error) throw new ActionError(error.message);

    await logActivity(
      { userId: profile.id, action: "REPORT_SUBMITTED", targetType: v.target_type.toLowerCase(), targetId: v.target_id, description: `Reported: ${v.reason}` },
      supabase,
    );
    return ok("Thanks — your report was sent to our moderators.");
  });
}
