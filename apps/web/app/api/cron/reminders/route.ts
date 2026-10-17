import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient, hasServiceRole } from "@/app/lib/supabase/admin";
import { processDueReminders, scheduleMissingReminders } from "@/app/lib/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Cron entry point (Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`). Authorized with SESSION_SECRET (or CRON_SECRET). */
export async function GET(req: NextRequest) {
  try {
    const secrets = [process.env.SESSION_SECRET, process.env.CRON_SECRET].filter((v): v is string => Boolean(v));
    const header = req.headers.get("authorization");
    if (secrets.length === 0 || !secrets.some((s) => header === `Bearer ${s}`)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!hasServiceRole()) {
      return NextResponse.json({ ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." }, { status: 500 });
    }
    const client = createAdminClient() as unknown as SupabaseClient;
    const scheduled = await scheduleMissingReminders(client);
    const summary = await processDueReminders(client, { limit: 200 });
    return NextResponse.json({ ok: true, scheduled, ...summary });
  } catch (error) {
    console.error("[api/cron/reminders]", error);
    return NextResponse.json({ ok: false, error: "Cron run failed." }, { status: 500 });
  }
}

export const POST = GET;
