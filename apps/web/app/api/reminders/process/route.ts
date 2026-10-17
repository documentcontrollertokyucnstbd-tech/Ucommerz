import { isStaffRole } from "@ucommerz/shared";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/app/lib/supabase/admin";
import { processDueReminders, scheduleMissingReminders } from "@/app/lib/reminders";

export const dynamic = "force-dynamic";

/** Signed-in provider (or admin) processes their own due reminders on demand. */
export async function POST() {
  try {
    const supabase = (await createClient()) as unknown as SupabaseClient;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ ok: false, error: "Please sign in." }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("role").eq("id", auth.user.id).maybeSingle();
    const role = profile?.role as string | undefined;
    if (!role || !["PROVIDER", "BOTH", "ADMIN", "SUPERADMIN"].includes(role)) {
      return NextResponse.json({ ok: false, error: "Providers only." }, { status: 403 });
    }

    // Service role sees every reminder row for recipients; the provider filter keeps the run scoped.
    const client = hasServiceRole() ? (createAdminClient() as unknown as SupabaseClient) : supabase;
    const scheduled = await scheduleMissingReminders(client).catch(() => 0);
    const summary = await processDueReminders(client, { providerId: isStaffRole(role) ? undefined : auth.user.id });
    return NextResponse.json({ ok: true, scheduled, ...summary });
  } catch (error) {
    console.error("[api/reminders/process]", error);
    return NextResponse.json({ ok: false, error: "Could not process reminders." }, { status: 500 });
  }
}
