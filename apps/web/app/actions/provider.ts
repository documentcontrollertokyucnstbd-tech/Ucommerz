"use server";

import { isStaffRole } from "@ucommerz/shared";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  bookingRulesSchema,
  businessHoursSchema,
  certificationSchema,
  customerNoteSchema,
  holidaySchema,
  packageSchema,
  portfolioSchema,
  reminderSettingsSchema,
  skillSchema,
} from "@ucommerz/shared";
import { requireProvider } from "@/app/lib/guards";
import { createAdminClient, hasServiceRole } from "@/app/lib/supabase/admin";
import { ActionError, limitAction, ok, parseInput, safeAction, type ActionResult } from "@/app/lib/action";
import { logActivity } from "@/app/lib/activity-service";
import { computePackagePrice } from "@/app/lib/pricing";
import { processDueReminders, scheduleMissingReminders, type ProcessSummary } from "@/app/lib/reminders";
import type { SupabaseClient } from "@supabase/supabase-js";

const uuid = z.string().uuid();
const blankToNull = (v: string | undefined | null) => (v && v.trim() ? v.trim() : null);

/* ------------------------------------------------------------------ skills */
export async function addSkillAction(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireProvider("/dashboard/provider-profile");
    const v = parseInput(skillSchema, input);
    const { error } = await supabase.from("provider_skills").insert({ provider_id: profile.id, ...v });
    if (error) throw new ActionError(error.message);
    revalidatePath("/dashboard/provider-profile");
    return ok("Skill added.");
  });
}
export async function deleteSkillAction(id: string): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireProvider();
    const { error } = await supabase.from("provider_skills").delete().eq("id", parseInput(uuid, id)).eq("provider_id", profile.id);
    if (error) throw new ActionError(error.message);
    revalidatePath("/dashboard/provider-profile");
    return ok("Skill removed.");
  });
}

/* ---------------------------------------------------------- certifications */
export async function addCertificationAction(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireProvider("/dashboard/provider-profile");
    const v = parseInput(certificationSchema, input);
    const { error } = await supabase.from("provider_certifications").insert({
      provider_id: profile.id,
      name: v.name.trim(),
      issuing_organization: blankToNull(v.issuing_organization),
      issue_date: blankToNull(v.issue_date),
      expiry_date: blankToNull(v.expiry_date),
      certificate_url: blankToNull(v.certificate_url),
    });
    if (error) throw new ActionError(error.message);
    revalidatePath("/dashboard/provider-profile");
    return ok("Certification added.");
  });
}
export async function deleteCertificationAction(id: string): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireProvider();
    const { error } = await supabase.from("provider_certifications").delete().eq("id", parseInput(uuid, id)).eq("provider_id", profile.id);
    if (error) throw new ActionError(error.message);
    revalidatePath("/dashboard/provider-profile");
    return ok("Certification removed.");
  });
}

/* --------------------------------------------------------------- portfolio */
const portfolioWithImages = portfolioSchema.and(z.object({ image_urls: z.array(z.string().url()).max(6) }));
export async function addPortfolioAction(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireProvider("/dashboard/provider-profile");
    const v = parseInput(portfolioWithImages, input);
    const { error } = await supabase.from("provider_portfolio").insert({
      provider_id: profile.id,
      title: v.title.trim(),
      description: blankToNull(v.description),
      project_url: blankToNull(v.project_url),
      image_urls: v.image_urls,
    });
    if (error) throw new ActionError(error.message);
    revalidatePath("/dashboard/provider-profile");
    if (profile.slug) revalidatePath(`/provider/${profile.slug}`);
    return ok("Portfolio item added.");
  });
}
export async function deletePortfolioAction(id: string): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireProvider();
    const { error } = await supabase.from("provider_portfolio").delete().eq("id", parseInput(uuid, id)).eq("provider_id", profile.id);
    if (error) throw new ActionError(error.message);
    revalidatePath("/dashboard/provider-profile");
    return ok("Portfolio item removed.");
  });
}

/* ---------------------------------------------------------- booking rules */
export async function saveBookingRulesAction(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireProvider("/dashboard/provider-settings");
    const v = parseInput(bookingRulesSchema, input);
    const { error } = await supabase.from("booking_rules").upsert({ provider_id: profile.id, ...v }, { onConflict: "provider_id" });
    if (error) throw new ActionError(error.message);
    await logActivity({ userId: profile.id, action: "SETTINGS_UPDATED", description: "Updated booking rules" }, supabase);
    revalidatePath("/dashboard/provider-settings");
    return ok("Booking rules saved.");
  });
}

export async function saveBusinessHoursAction(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireProvider("/dashboard/provider-settings");
    const v = parseInput(businessHoursSchema, input);
    const rows = v.days.map((d) => ({
      provider_id: profile.id,
      day_of_week: d.day_of_week,
      is_open: d.is_open,
      open_time: d.is_open ? blankToNull(d.open_time) : null,
      close_time: d.is_open ? blankToNull(d.close_time) : null,
      break_start: d.is_open ? blankToNull(d.break_start) : null,
      break_end: d.is_open ? blankToNull(d.break_end) : null,
    }));
    for (const d of v.days) {
      if (d.is_open && !!d.break_start !== !!d.break_end) throw new ActionError("Set both break start and break end, or neither.");
      if (d.is_open && d.break_start && d.break_end && !(d.break_start < d.break_end)) throw new ActionError("Break must end after it starts.");
    }
    const { error } = await supabase.from("business_hours").upsert(rows, { onConflict: "provider_id,day_of_week" });
    if (error) throw new ActionError(error.message);
    await logActivity({ userId: profile.id, action: "SETTINGS_UPDATED", description: "Updated business hours" }, supabase);
    revalidatePath("/dashboard/provider-settings");
    return ok("Business hours saved.");
  });
}

export async function addHolidayAction(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireProvider("/dashboard/provider-settings");
    const v = parseInput(holidaySchema, input);
    const { error } = await supabase.from("holidays").insert({ provider_id: profile.id, date: v.date, name: v.name.trim(), is_recurring: v.is_recurring });
    if (error) throw new ActionError(error.message);
    revalidatePath("/dashboard/provider-settings");
    return ok("Holiday added.");
  });
}
export async function deleteHolidayAction(id: string): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireProvider();
    const { error } = await supabase.from("holidays").delete().eq("id", parseInput(uuid, id)).eq("provider_id", profile.id);
    if (error) throw new ActionError(error.message);
    revalidatePath("/dashboard/provider-settings");
    return ok("Holiday removed.");
  });
}

/* ------------------------------------------------------------ reminders */
export async function saveReminderSettingsAction(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireProvider("/dashboard/reminder-settings");
    const v = parseInput(reminderSettingsSchema, input);
    const { error } = await supabase.from("reminder_settings").upsert(
      { provider_id: profile.id, enabled: v.enabled, reminder_hours: v.reminder_hours, send_email: v.send_email, send_sms: v.send_sms, sms_phone: blankToNull(v.sms_phone) },
      { onConflict: "provider_id" },
    );
    if (error) throw new ActionError(error.message);
    await logActivity({ userId: profile.id, action: "SETTINGS_UPDATED", description: "Updated reminder settings" }, supabase);
    revalidatePath("/dashboard/reminder-settings");
    return ok("Reminder settings saved.");
  });
}

export async function runRemindersNowAction(): Promise<ActionResult<ProcessSummary & { scheduled: number }>> {
  return safeAction<ProcessSummary & { scheduled: number }>(async () => {
    await limitAction("run-reminders", 5, 60_000);
    const { profile, supabase } = await requireProvider("/dashboard/reminder-settings");
    const client = hasServiceRole() ? (createAdminClient() as unknown as SupabaseClient) : supabase;
    const scheduled = await scheduleMissingReminders(client).catch(() => 0);
    const summary = await processDueReminders(client, { providerId: isStaffRole(profile.role) ? undefined : profile.id });
    revalidatePath("/dashboard/reminder-settings");
    return ok(`Processed ${summary.due} due reminder(s): ${summary.sent} sent, ${summary.failed} failed.`, { ...summary, scheduled });
  });
}

/* ------------------------------------------------------------ customers */
export async function saveCustomerNoteAction(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireProvider("/dashboard/customers");
    const v = parseInput(customerNoteSchema, input);
    const { count } = await supabase.from("bookings").select("id", { count: "exact", head: true }).eq("provider_id", profile.id).eq("seeker_id", v.customer_id);
    if (!count) throw new ActionError("You can only add notes for customers you have bookings with.");
    const { error } = await supabase.from("customer_notes").insert({ provider_id: profile.id, customer_id: v.customer_id, note: v.note.trim() });
    if (error) throw new ActionError(error.message);
    revalidatePath(`/dashboard/customers/${v.customer_id}`);
    return ok("Note saved.");
  });
}
export async function deleteCustomerNoteAction(id: string, customerId: string): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireProvider();
    const { error } = await supabase.from("customer_notes").delete().eq("id", parseInput(uuid, id)).eq("provider_id", profile.id);
    if (error) throw new ActionError(error.message);
    revalidatePath(`/dashboard/customers/${parseInput(uuid, customerId)}`);
    return ok("Note deleted.");
  });
}

/* ------------------------------------------------------------- packages */
export async function createPackageAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction<{ id: string }>(async () => {
    await limitAction("create-package", 10, 10 * 60_000);
    const { profile, supabase } = await requireProvider("/dashboard/my-packages");
    const v = parseInput(packageSchema, input);

    const { data: services } = await supabase.from("services").select("id, price, provider_id").in("id", v.service_ids);
    const owned = (services ?? []).filter((s) => s.provider_id === profile.id);
    if (owned.length !== v.service_ids.length) throw new ActionError("You can only bundle your own services.");
    const { total } = computePackagePrice(owned.map((s) => ({ price: s.price as number })), v.discount_percentage);

    const { data: pkg, error } = await supabase
      .from("packages")
      .insert({ provider_id: profile.id, title: v.title.trim(), description: blankToNull(v.description), discount_percentage: v.discount_percentage, price: total, is_active: v.is_active })
      .select("id")
      .single();
    if (error || !pkg) throw new ActionError(error?.message ?? "Could not create the package.");

    const { error: e2 } = await supabase.from("package_services").insert(v.service_ids.map((service_id) => ({ package_id: pkg.id, service_id, quantity: 1 })));
    if (e2) {
      await supabase.from("packages").delete().eq("id", pkg.id);
      throw new ActionError(e2.message);
    }
    await logActivity({ userId: profile.id, action: "PACKAGE_CREATED", targetType: "package", targetId: pkg.id, description: `Created package “${v.title}”` }, supabase);
    revalidatePath("/dashboard/my-packages");
    if (profile.slug) revalidatePath(`/provider/${profile.slug}`);
    return ok("Package created.", { id: pkg.id });
  });
}

export async function togglePackageAction(id: string, active: boolean): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireProvider();
    const { error } = await supabase.from("packages").update({ is_active: active }).eq("id", parseInput(uuid, id)).eq("provider_id", profile.id);
    if (error) throw new ActionError(error.message);
    revalidatePath("/dashboard/my-packages");
    if (profile.slug) revalidatePath(`/provider/${profile.slug}`);
    return ok(active ? "Package is live." : "Package paused.");
  });
}
export async function deletePackageAction(id: string): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireProvider();
    const { error } = await supabase.from("packages").delete().eq("id", parseInput(uuid, id)).eq("provider_id", profile.id);
    if (error) throw new ActionError(error.message);
    revalidatePath("/dashboard/my-packages");
    return ok("Package deleted.");
  });
}
