import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadBookingContext, sendReminderEmail } from "@/app/lib/email-service";

export type ReminderPrefs = {
  enabled: boolean;
  reminder_hours: number;
  send_email: boolean;
  send_sms: boolean;
  sms_phone: string | null;
};

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = {
  enabled: true,
  reminder_hours: 24,
  send_email: true,
  send_sms: false,
  sms_phone: null,
};

export async function getReminderPrefs(client: SupabaseClient, providerId: string): Promise<ReminderPrefs> {
  const { data } = await client.from("reminder_settings").select("*").eq("provider_id", providerId).maybeSingle();
  return { ...DEFAULT_REMINDER_PREFS, ...((data as Partial<ReminderPrefs> | null) ?? {}) };
}

type BookingForReminder = {
  id: string;
  provider_id: string;
  booking_date: string;
  seeker_id: string;
};

/**
 * Creates (once) the reminder row for a confirmed booking, based on the provider's settings.
 * Works with a provider session (RLS) or the service-role client.
 */
export async function scheduleReminder(client: SupabaseClient, booking: BookingForReminder): Promise<"scheduled" | "skipped"> {
  const prefs = await getReminderPrefs(client, booking.provider_id);
  if (!prefs.enabled || (!prefs.send_email && !prefs.send_sms)) return "skipped";

  const { data: existing } = await client
    .from("reminders")
    .select("id")
    .eq("booking_id", booking.id)
    .eq("status", "PENDING")
    .limit(1)
    .maybeSingle();
  if (existing) return "skipped";

  const bookingTime = new Date(booking.booking_date).getTime();
  let reminderTime = bookingTime - prefs.reminder_hours * 3600_000;
  if (bookingTime <= Date.now()) return "skipped";
  // Booking is sooner than the lead time: remind a few minutes from now instead.
  if (reminderTime < Date.now()) reminderTime = Date.now() + 5 * 60_000;

  const { data: seeker } = await client.from("users").select("email, phone").eq("id", booking.seeker_id).maybeSingle();
  const reminderType = prefs.send_email && prefs.send_sms ? "BOTH" : prefs.send_sms ? "SMS" : "EMAIL";

  const { error } = await client.from("reminders").insert({
    booking_id: booking.id,
    recipient_email: (seeker as { email?: string } | null)?.email ?? null,
    recipient_phone: prefs.sms_phone || (seeker as { phone?: string } | null)?.phone || null,
    reminder_type: reminderType,
    reminder_time: new Date(reminderTime).toISOString(),
    status: "PENDING",
  });
  if (error) {
    console.error("[reminders] schedule failed", error.message);
    return "skipped";
  }
  return "scheduled";
}

export type ProcessSummary = { due: number; sent: number; failed: number; skipped: number; errors: string[] };

/**
 * Scans due reminders, sends the email through Resend and updates each row.
 * Pass the service-role client for cron runs. `providerId` limits the run to one provider.
 */
export async function processDueReminders(
  client: SupabaseClient,
  options: { providerId?: string; limit?: number } = {},
): Promise<ProcessSummary> {
  const summary: ProcessSummary = { due: 0, sent: 0, failed: 0, skipped: 0, errors: [] };

  const { data: due, error } = await client
    .from("reminders")
    .select("id, booking_id, recipient_email, reminder_type, reminder_time")
    .eq("status", "PENDING")
    .lte("reminder_time", new Date().toISOString())
    .order("reminder_time", { ascending: true })
    .limit(options.limit ?? 100);
  if (error) throw new Error(error.message);

  const rows = (due as { id: string; booking_id: string; recipient_email: string | null; reminder_type: string }[]) ?? [];
  summary.due = rows.length;

  for (const row of rows) {
    const fail = async (message: string) => {
      summary.failed++;
      summary.errors.push(`${row.id}: ${message}`);
      await client.from("reminders").update({ status: "FAILED", error_message: message }).eq("id", row.id);
    };

    try {
      const ctx = await loadBookingContext(client, row.booking_id);
      if (!ctx) {
        await fail("Booking not found");
        continue;
      }
      if (options.providerId && ctx.provider.id !== options.providerId) {
        summary.skipped++;
        continue;
      }
      if (ctx.status !== "CONFIRMED" && ctx.status !== "PENDING") {
        await fail(`Booking is ${ctx.status.toLowerCase()} — reminder not needed`);
        continue;
      }
      if (row.reminder_type === "SMS") {
        await fail("SMS reminders need an SMS provider (not configured)");
        continue;
      }

      const toSeeker = await sendReminderEmail(client, ctx, "seeker");
      if (!toSeeker.ok) {
        await fail(toSeeker.error);
        continue;
      }
      // Heads-up copy to the provider (best effort).
      await sendReminderEmail(client, ctx, "provider");

      await client
        .from("reminders")
        .update({
          status: "SENT",
          sent_at: new Date().toISOString(),
          error_message: row.reminder_type === "BOTH" ? "Email sent; SMS provider not configured" : null,
        })
        .eq("id", row.id);
      await client.from("bookings").update({ reminder_sent: true }).eq("id", row.booking_id);
      summary.sent++;
    } catch (e) {
      await fail(e instanceof Error ? e.message : "Unexpected error");
    }
  }
  return summary;
}

/** Cron helper: creates reminder rows for confirmed bookings in the next 7 days that have none yet. */
export async function scheduleMissingReminders(client: SupabaseClient): Promise<number> {
  const now = new Date();
  const horizon = new Date(now.getTime() + 7 * 24 * 3600_000);
  const { data } = await client
    .from("bookings")
    .select("id, provider_id, seeker_id, booking_date")
    .eq("status", "CONFIRMED")
    .eq("reminder_sent", false)
    .gt("booking_date", now.toISOString())
    .lte("booking_date", horizon.toISOString())
    .limit(500);
  const bookings = (data as BookingForReminder[]) ?? [];
  if (bookings.length === 0) return 0;

  const { data: existing } = await client
    .from("reminders")
    .select("booking_id")
    .in("booking_id", bookings.map((b) => b.id));
  const has = new Set(((existing as { booking_id: string }[]) ?? []).map((r) => r.booking_id));

  let created = 0;
  for (const b of bookings) {
    if (has.has(b.id)) continue;
    if ((await scheduleReminder(client, b)) === "scheduled") created++;
  }
  return created;
}
