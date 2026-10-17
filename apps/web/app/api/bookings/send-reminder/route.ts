import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/app/lib/supabase/server";
import { loadBookingContext, sendReminderEmail } from "@/app/lib/email-service";
import { logActivity } from "@/app/lib/activity-service";
import { getClientIp, rateLimit } from "@/app/lib/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ booking_id: z.string().uuid() });

/** Provider sends a manual reminder email for an upcoming booking. */
export async function POST(req: NextRequest) {
  try {
    const rl = rateLimit(`send-reminder:${getClientIp(req.headers)}`, { max: 10, windowMs: 60_000 });
    if (!rl.success) return NextResponse.json({ ok: false, error: "Too many requests." }, { status: 429 });

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });

    const supabase = (await createClient()) as unknown as SupabaseClient;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ ok: false, error: "Please sign in." }, { status: 401 });

    const { data: booking } = await supabase
      .from("bookings")
      .select("id, provider_id, status, booking_date")
      .eq("id", parsed.data.booking_id)
      .maybeSingle();
    if (!booking || booking.provider_id !== auth.user.id) {
      return NextResponse.json({ ok: false, error: "Booking not found." }, { status: 404 });
    }
    if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
      return NextResponse.json({ ok: false, error: "Reminders can only be sent for open bookings." }, { status: 400 });
    }

    const ctx = await loadBookingContext(supabase, booking.id);
    if (!ctx) return NextResponse.json({ ok: false, error: "Booking details unavailable." }, { status: 404 });

    const result = await sendReminderEmail(supabase, ctx, "seeker");
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error ?? "Email could not be sent." }, { status: 502 });

    await supabase.from("bookings").update({ reminder_sent: true }).eq("id", booking.id);
    await logActivity({ userId: auth.user.id, action: "BOOKING_STATUS_CHANGED", targetType: "booking", targetId: booking.id, description: "Sent a manual reminder" }, supabase);
    return NextResponse.json({ ok: true, message: "Reminder sent to the customer." });
  } catch (error) {
    console.error("[api/bookings/send-reminder]", error);
    return NextResponse.json({ ok: false, error: "Something went wrong." }, { status: 500 });
  }
}
