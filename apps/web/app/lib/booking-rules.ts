import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DAYS_OF_WEEK } from "@ucommerz/shared";

const ACTIVE_STATUSES = ["PENDING", "CONFIRMED", "IN_PROGRESS"];

function toMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const [h, m] = time.split(":");
  const hh = Number(h);
  const mm = Number(m ?? 0);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

export type RuleCheckInput = {
  providerId: string;
  /** The instant the booking starts (ISO string from the browser). */
  startIso: string;
  /** The wall-clock the customer picked, "YYYY-MM-DDTHH:mm". Provider hours are interpreted in this wall-clock. */
  local: string;
  durationHours: number;
};

/**
 * Validates a booking request against the provider's rules:
 * minimum notice, holidays, weekly business hours (with breaks),
 * max bookings per day and conflicts (including the buffer between jobs).
 * Returns a human-readable error, or null when the slot is fine.
 */
export async function validateBookingSlot(supabase: SupabaseClient, input: RuleCheckInput): Promise<string | null> {
  const start = new Date(input.startIso);
  if (Number.isNaN(start.getTime())) return "Choose a valid date and time.";
  if (start.getTime() <= Date.now()) return "Choose a date and time in the future.";

  const localMatch = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(input.local);
  if (!localMatch) return "Choose a valid date and time.";
  const [, y, mo, d, hh, mi] = localMatch;
  const dateKey = `${y}-${mo}-${d}`;
  const startMinutes = Number(hh) * 60 + Number(mi);
  const endMinutes = startMinutes + Math.round(input.durationHours * 60);
  const dow = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d))).getUTCDay();

  const [rulesRes, hoursRes, holidaysRes] = await Promise.all([
    supabase.from("booking_rules").select("*").eq("provider_id", input.providerId).maybeSingle(),
    supabase.from("business_hours").select("*").eq("provider_id", input.providerId),
    supabase.from("holidays").select("*").eq("provider_id", input.providerId),
  ]);

  const rules = rulesRes.data as {
    min_notice_hours: number;
    max_bookings_per_day: number;
    buffer_time_minutes: number;
  } | null;

  // 1. Minimum notice
  if (rules && rules.min_notice_hours > 0) {
    const earliest = Date.now() + rules.min_notice_hours * 3600_000;
    if (start.getTime() < earliest) return `This provider needs at least ${rules.min_notice_hours} hour(s) notice.`;
  }

  // 2. Holidays
  const holidays = (holidaysRes.data as { date: string; name: string; is_recurring: boolean }[]) ?? [];
  for (const h of holidays) {
    const same = h.is_recurring ? h.date.slice(5) === dateKey.slice(5) : h.date === dateKey;
    if (same) return `The provider is unavailable on ${h.name}.`;
  }

  // 3. Business hours
  const hours = (hoursRes.data as {
    day_of_week: number;
    is_open: boolean;
    open_time: string | null;
    close_time: string | null;
    break_start: string | null;
    break_end: string | null;
  }[]) ?? [];
  if (hours.length > 0) {
    const day = hours.find((h) => h.day_of_week === dow);
    if (!day || !day.is_open) return `The provider is closed on ${DAYS_OF_WEEK[dow]}s.`;
    const open = toMinutes(day.open_time);
    const close = toMinutes(day.close_time);
    if (open != null && close != null && (startMinutes < open || endMinutes > close)) {
      return `On ${DAYS_OF_WEEK[dow]}s the provider works ${day.open_time?.slice(0, 5)}–${day.close_time?.slice(0, 5)}. Pick a time that fits within those hours.`;
    }
    const bs = toMinutes(day.break_start);
    const be = toMinutes(day.break_end);
    if (bs != null && be != null && startMinutes < be && endMinutes > bs) {
      return `The provider is on a break ${day.break_start?.slice(0, 5)}–${day.break_end?.slice(0, 5)}. Choose another time.`;
    }
  }

  // 4 + 5. Capacity and conflicts: look at the provider's bookings on the same wall-clock day.
  const offsetMs = start.getTime() - Date.parse(`${input.local.slice(0, 16)}:00Z`);
  const dayStart = Date.parse(`${dateKey}T00:00:00Z`) + offsetMs;
  const dayEnd = dayStart + 24 * 3600_000;
  const { data: existing } = await supabase
    .from("bookings")
    .select("booking_date, duration, status")
    .eq("provider_id", input.providerId)
    .in("status", ACTIVE_STATUSES)
    .gte("booking_date", new Date(dayStart - 24 * 3600_000).toISOString())
    .lt("booking_date", new Date(dayEnd + 24 * 3600_000).toISOString());
  const rows = (existing as { booking_date: string; duration: number }[]) ?? [];

  const sameDay = rows.filter((r) => {
    const t = new Date(r.booking_date).getTime();
    return t >= dayStart && t < dayEnd;
  });
  if (rules && sameDay.length >= rules.max_bookings_per_day) {
    return "This provider is fully booked for that day. Try another date.";
  }

  const bufferMs = (rules?.buffer_time_minutes ?? 0) * 60_000;
  const newStart = start.getTime();
  const newEnd = newStart + input.durationHours * 3600_000;
  for (const r of rows) {
    const s = new Date(r.booking_date).getTime();
    const e = s + Number(r.duration) * 3600_000;
    if (newStart < e + bufferMs && newEnd + bufferMs > s) return "That time slot is already booked. Please choose another time.";
  }

  return null;
}
