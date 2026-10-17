"use server";

import { isStaffRole } from "@ucommerz/shared";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  BOOKING_STATUSES,
  PROVIDER_BOOKING_TRANSITIONS,
  SEEKER_BOOKING_TRANSITIONS,
  bookingSchema,
  type BookingStatus,
} from "@ucommerz/shared";
import { requireUser } from "@/app/lib/guards";
import { createAdminClient, hasServiceRole } from "@/app/lib/supabase/admin";
import { ActionError, limitAction, ok, parseInput, safeAction, type ActionResult } from "@/app/lib/action";
import { logActivity } from "@/app/lib/activity-service";
import { validateBookingSlot } from "@/app/lib/booking-rules";
import { computeTotal } from "@/app/lib/pricing";
import { scheduleReminder } from "@/app/lib/reminders";
import {
  loadBookingContext,
  sendBookingConfirmationEmail,
  sendBookingRequestEmail,
  sendBookingStatusEmail,
  sendReviewRequestEmail,
} from "@/app/lib/email-service";

const createBookingSchema = bookingSchema.extend({
  /** Wall-clock chosen by the customer, "YYYY-MM-DDTHH:mm" (provider hours are checked against it). */
  local_datetime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Choose a valid date and time"),
});

/* -------------------------------------------------------------- create */
export async function createBookingAction(input: unknown): Promise<ActionResult<{ bookingId: string; status: string }>> {
  return safeAction<{ bookingId: string; status: string }>(async () => {
    await limitAction("create-booking", 10, 10 * 60_000);
    const { profile, supabase } = await requireUser();
    const v = parseInput(createBookingSchema, input);

    const { data: service } = await supabase
      .from("services")
      .select("id, provider_id, title, price, price_unit, status, min_duration, max_duration")
      .eq("id", v.service_id)
      .maybeSingle();
    if (!service) throw new ActionError("This service could not be found.");
    if (service.status !== "ACTIVE") throw new ActionError("This service is not available for booking.");
    if (service.provider_id === profile.id) throw new ActionError("You can't book your own service.");
    if (profile.role === "PROVIDER") {
      throw new ActionError("Your account is set up as a provider only. Enable customer access in your profile to book services.");
    }
    if (service.min_duration != null && v.duration < Number(service.min_duration)) {
      throw new ActionError(`Minimum duration is ${service.min_duration} hour(s).`);
    }
    if (service.max_duration != null && v.duration > Number(service.max_duration)) {
      throw new ActionError(`Maximum duration is ${service.max_duration} hour(s).`);
    }

    const problem = await validateBookingSlot(supabase, {
      providerId: service.provider_id,
      startIso: new Date(v.booking_date).toISOString(),
      local: v.local_datetime,
      durationHours: v.duration,
    });
    if (problem) throw new ActionError(problem);

    const total = computeTotal(service.price, service.price_unit, v.duration);
    const { data: inserted, error } = await supabase
      .from("bookings")
      .insert({
        service_id: service.id,
        seeker_id: profile.id,
        provider_id: service.provider_id,
        booking_date: new Date(v.booking_date).toISOString(),
        duration: v.duration,
        total_price: total,
        notes: v.notes || null,
      })
      .select("id, provider_id, seeker_id, booking_date")
      .single();
    if (error || !inserted) throw new ActionError(error?.message ?? "Could not create the booking.");

    let status = "PENDING";
    try {
      // Auto-confirm (provider setting) needs the service role: customers can't confirm their own booking.
      const { data: rules } = await supabase.from("booking_rules").select("auto_confirm").eq("provider_id", service.provider_id).maybeSingle();
      if (rules?.auto_confirm && hasServiceRole()) {
        const admin = createAdminClient();
        const { error: confirmError } = await admin.from("bookings").update({ status: "CONFIRMED" }).eq("id", inserted.id);
        if (!confirmError) {
          status = "CONFIRMED";
          await scheduleReminder(admin, inserted);
        }
      }

      const ctx = await loadBookingContext(supabase, inserted.id);
      if (ctx) {
        await sendBookingRequestEmail(supabase, ctx);
        if (status === "CONFIRMED") await sendBookingConfirmationEmail(supabase, { ...ctx, status });
      }
    } catch (e) {
      console.error("[createBooking] side effects failed", e);
    }

    await logActivity(
      { userId: profile.id, action: "BOOKING_CREATED", targetType: "booking", targetId: inserted.id, description: `Requested "${service.title}"` },
      supabase,
    );
    revalidatePath("/dashboard", "layout");
    return ok(status === "CONFIRMED" ? "Booking confirmed!" : "Booking request sent. The provider will respond soon.", {
      bookingId: inserted.id as string,
      status,
    });
  });
}

/* -------------------------------------------------------- status change */
const statusInput = z.object({
  booking_id: z.string().uuid(),
  status: z.enum(BOOKING_STATUSES),
  reason: z.string().max(500).optional().or(z.literal("")),
});

const HEADLINES: Partial<Record<BookingStatus, string>> = {
  IN_PROGRESS: "Your booking is in progress",
  COMPLETED: "Your booking is complete",
  CANCELLED: "A booking was cancelled",
  DISPUTED: "A booking was disputed",
};

export async function updateBookingStatusAction(input: unknown): Promise<ActionResult<{ status: string }>> {
  return safeAction<{ status: string }>(async () => {
    await limitAction("booking-status", 30);
    const { profile, supabase } = await requireUser();
    const v = parseInput(statusInput, input);

    const { data: booking } = await supabase.from("bookings").select("*").eq("id", v.booking_id).maybeSingle();
    if (!booking) throw new ActionError("Booking not found.");

    const isProvider = booking.provider_id === profile.id;
    const isSeeker = booking.seeker_id === profile.id;
    const isAdmin = isStaffRole(profile.role);
    if (!isProvider && !isSeeker && !isAdmin) throw new ActionError("You don't have access to this booking.");

    const current = booking.status as BookingStatus;
    const allowed = isAdmin
      ? BOOKING_STATUSES.filter((s) => s !== current)
      : isProvider
        ? PROVIDER_BOOKING_TRANSITIONS[current]
        : SEEKER_BOOKING_TRANSITIONS[current];
    if (!allowed.includes(v.status)) {
      throw new ActionError(`A ${current.replace("_", " ").toLowerCase()} booking can't be changed to ${v.status.replace("_", " ").toLowerCase()}.`);
    }

    const patch: Record<string, unknown> = { status: v.status };
    if (v.status === "CANCELLED") patch.cancellation_reason = v.reason || null;
    if (v.status === "COMPLETED") patch.completed_at = new Date().toISOString();

    const { data: updated, error } = await supabase.from("bookings").update(patch).eq("id", v.booking_id).select("id").maybeSingle();
    if (error) throw new ActionError(error.message);
    if (!updated) throw new ActionError("You're not allowed to make that change.");

    try {
      const ctx = await loadBookingContext(supabase, v.booking_id);
      if (ctx) {
        const next = { ...ctx, status: v.status };
        if (v.status === "CONFIRMED") {
          await sendBookingConfirmationEmail(supabase, next);
          await scheduleReminder(supabase, booking);
        } else if (v.status === "COMPLETED") {
          await sendReviewRequestEmail(supabase, next);
        } else {
          const to = isProvider ? "seeker" : "provider";
          await sendBookingStatusEmail(supabase, next, to, HEADLINES[v.status] ?? "Booking update");
        }
      }
    } catch (e) {
      console.error("[updateBookingStatus] side effects failed", e);
    }

    await logActivity(
      {
        userId: profile.id,
        action: "BOOKING_STATUS_CHANGED",
        targetType: "booking",
        targetId: v.booking_id,
        description: `Booking ${current.toLowerCase()} → ${v.status.toLowerCase()}`,
        metadata: { from: current, to: v.status },
      },
      supabase,
    );

    revalidatePath("/dashboard", "layout");
    revalidatePath(`/dashboard/bookings/${v.booking_id}`);
    const messages: Partial<Record<BookingStatus, string>> = {
      CONFIRMED: "Booking accepted.",
      CANCELLED: isProvider ? "Booking declined." : "Booking cancelled.",
      IN_PROGRESS: "Marked as in progress.",
      COMPLETED: "Booking marked as completed.",
      DISPUTED: "Dispute opened. Our team will review it.",
    };
    return ok(messages[v.status] ?? "Booking updated.", { status: v.status });
  });
}

/* ----------------------------------------------------- package bookings */
const packageBookingSchema = z.object({
  package_id: z.string().uuid(),
  booking_date: z.string().min(1, "Choose a date"),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export async function createPackageBookingAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction<{ id: string }>(async () => {
    await limitAction("package-booking", 8, 10 * 60_000);
    const { profile, supabase } = await requireUser();
    const v = parseInput(packageBookingSchema, input);
    if (new Date(v.booking_date).getTime() <= Date.now()) throw new ActionError("Choose a date in the future.");

    const { data: pkg } = await supabase.from("packages").select("id, provider_id, title, price, is_active").eq("id", v.package_id).maybeSingle();
    if (!pkg || !pkg.is_active) throw new ActionError("This package is not available.");
    if (pkg.provider_id === profile.id) throw new ActionError("You can't book your own package.");

    const { data, error } = await supabase
      .from("package_bookings")
      .insert({
        package_id: pkg.id,
        seeker_id: profile.id,
        provider_id: pkg.provider_id,
        booking_date: new Date(v.booking_date).toISOString(),
        total_price: pkg.price,
        notes: v.notes || null,
      })
      .select("id")
      .single();
    if (error || !data) throw new ActionError(error?.message ?? "Could not book this package.");

    await logActivity(
      { userId: profile.id, action: "BOOKING_CREATED", targetType: "package_booking", targetId: data.id, description: `Requested package "${pkg.title}"` },
      supabase,
    );
    revalidatePath("/dashboard/bookings");
    return ok("Package request sent.", { id: data.id as string });
  });
}

export async function updatePackageBookingStatusAction(id: string, status: string): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireUser();
    const newStatus = parseInput(z.enum(BOOKING_STATUSES), status);
    const bookingId = parseInput(z.string().uuid(), id);
    const { data: row } = await supabase.from("package_bookings").select("*").eq("id", bookingId).maybeSingle();
    if (!row) throw new ActionError("Package booking not found.");
    const isProvider = row.provider_id === profile.id;
    const isSeeker = row.seeker_id === profile.id;
    if (!isProvider && !isSeeker) throw new ActionError("You don't have access to this booking.");
    const allowed = isProvider ? PROVIDER_BOOKING_TRANSITIONS[row.status as BookingStatus] : SEEKER_BOOKING_TRANSITIONS[row.status as BookingStatus];
    if (!allowed.includes(newStatus)) throw new ActionError("That status change isn't allowed.");

    const patch: Record<string, unknown> = { status: newStatus };
    if (newStatus === "COMPLETED") patch.completed_at = new Date().toISOString();
    const { error } = await supabase.from("package_bookings").update(patch).eq("id", bookingId);
    if (error) throw new ActionError(error.message);
    revalidatePath("/dashboard/bookings");
    return ok("Package booking updated.");
  });
}
