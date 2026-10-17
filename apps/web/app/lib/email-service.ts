import "server-only";
import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmailSettingsInput } from "@ucommerz/shared";
import { absoluteUrl, formatCurrency, formatDateTime } from "@/app/lib/utils";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */
export type BookingEmailContext = {
  bookingId: string;
  serviceId: string;
  serviceTitle: string;
  bookingDate: string;
  duration: number;
  totalPrice: number;
  status: string;
  notes: string | null;
  seeker: { id: string; name: string; email: string };
  provider: { id: string; name: string; email: string };
};

export type EmailResult = { ok: true; id: string | null } | { ok: false; error: string };

export const DEFAULT_EMAIL_SETTINGS: EmailSettingsInput = {
  from_name: "UCOMMERZ",
  from_email: process.env.EMAIL_FROM ?? "notifications@ucommerz.com",
  reply_to: "",
  booking_emails: true,
  reminder_emails: true,
  review_request_emails: true,
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */
export function escapeHtml(input: string | null | undefined): string {
  return (input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout(opts: { preheader: string; heading: string; bodyHtml: string; ctaLabel?: string; ctaUrl?: string }): string {
  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `<tr><td style="padding:8px 32px 32px"><a href="${escapeHtml(opts.ctaUrl)}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px">${escapeHtml(opts.ctaLabel)}</a></td></tr>`
      : "";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(opts.heading)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(opts.preheader)}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
<tr><td style="background:#1e1b4b;padding:22px 32px"><span style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:.5px">UCOMMERZ</span><span style="color:#a5b4fc;font-size:11px;margin-left:8px;letter-spacing:2px;text-transform:uppercase">Service Marketplace</span></td></tr>
<tr><td style="padding:32px 32px 8px"><h1 style="margin:0;font-size:22px;line-height:1.3;color:#0f172a">${escapeHtml(opts.heading)}</h1></td></tr>
<tr><td style="padding:8px 32px 24px;font-size:15px;line-height:1.6;color:#334155">${opts.bodyHtml}</td></tr>
${cta}
<tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b">You are receiving this email because of activity on your UCOMMERZ account.<br>© ${new Date().getFullYear()} UCOMMERZ</td></tr>
</table></td></tr></table></body></html>`;
}

function detailsTable(ctx: BookingEmailContext): string {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 0;color:#64748b;width:120px">${label}</td><td style="padding:6px 0;font-weight:600;color:#0f172a">${value}</td></tr>`;
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:16px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:8px 16px">
${row("Service", escapeHtml(ctx.serviceTitle))}
${row("When", escapeHtml(formatDateTime(ctx.bookingDate)))}
${row("Duration", `${ctx.duration} hour${ctx.duration === 1 ? "" : "s"}`)}
${row("Total", escapeHtml(formatCurrency(ctx.totalPrice)))}
${row("Status", escapeHtml(ctx.status.replace("_", " ").toLowerCase()))}
</table>`;
}

/* -------------------------------------------------------------------------- */
/* HTML templates                                                              */
/* -------------------------------------------------------------------------- */
export function bookingRequestTemplate(ctx: BookingEmailContext): { subject: string; html: string } {
  return {
    subject: `New booking request: ${ctx.serviceTitle}`,
    html: layout({
      preheader: `${ctx.seeker.name} requested ${ctx.serviceTitle}`,
      heading: "You have a new booking request",
      bodyHtml: `<p>Hi ${escapeHtml(ctx.provider.name)},</p><p><strong>${escapeHtml(ctx.seeker.name)}</strong> would like to book your service.</p>${detailsTable(ctx)}${
        ctx.notes ? `<p style="color:#475569"><em>“${escapeHtml(ctx.notes)}”</em></p>` : ""
      }<p>Review the request and accept or decline it from your dashboard.</p>`,
      ctaLabel: "Review booking",
      ctaUrl: absoluteUrl(`/dashboard/bookings/${ctx.bookingId}`),
    }),
  };
}

export function bookingConfirmationTemplate(ctx: BookingEmailContext): { subject: string; html: string } {
  return {
    subject: `Booking confirmed: ${ctx.serviceTitle}`,
    html: layout({
      preheader: `${ctx.provider.name} confirmed your booking`,
      heading: "Your booking is confirmed",
      bodyHtml: `<p>Hi ${escapeHtml(ctx.seeker.name)},</p><p>Great news — <strong>${escapeHtml(ctx.provider.name)}</strong> has confirmed your booking.</p>${detailsTable(ctx)}<p>You can message your provider any time from your dashboard.</p>`,
      ctaLabel: "View booking",
      ctaUrl: absoluteUrl(`/dashboard/bookings/${ctx.bookingId}`),
    }),
  };
}

export function bookingStatusTemplate(ctx: BookingEmailContext, recipientName: string, headline: string): { subject: string; html: string } {
  return {
    subject: `${headline}: ${ctx.serviceTitle}`,
    html: layout({
      preheader: headline,
      heading: headline,
      bodyHtml: `<p>Hi ${escapeHtml(recipientName)},</p><p>There is an update to a booking for <strong>${escapeHtml(ctx.serviceTitle)}</strong>.</p>${detailsTable(ctx)}`,
      ctaLabel: "View booking",
      ctaUrl: absoluteUrl(`/dashboard/bookings/${ctx.bookingId}`),
    }),
  };
}

export function bookingReminderTemplate(ctx: BookingEmailContext, recipientName: string, role: "seeker" | "provider"): { subject: string; html: string } {
  const other = role === "seeker" ? ctx.provider.name : ctx.seeker.name;
  return {
    subject: `Reminder: ${ctx.serviceTitle} on ${formatDateTime(ctx.bookingDate)}`,
    html: layout({
      preheader: `Upcoming booking with ${other}`,
      heading: "Upcoming booking reminder",
      bodyHtml: `<p>Hi ${escapeHtml(recipientName)},</p><p>This is a friendly reminder about your upcoming booking with <strong>${escapeHtml(other)}</strong>.</p>${detailsTable(ctx)}`,
      ctaLabel: "Open booking",
      ctaUrl: absoluteUrl(`/dashboard/bookings/${ctx.bookingId}`),
    }),
  };
}

export function reviewRequestTemplate(ctx: BookingEmailContext): { subject: string; html: string } {
  return {
    subject: `How was ${ctx.serviceTitle}? Leave a review`,
    html: layout({
      preheader: `Share your experience with ${ctx.provider.name}`,
      heading: "How did it go?",
      bodyHtml: `<p>Hi ${escapeHtml(ctx.seeker.name)},</p><p>Your booking with <strong>${escapeHtml(ctx.provider.name)}</strong> is complete. Your feedback helps other people choose with confidence and helps great providers get noticed.</p>`,
      ctaLabel: "Write a review",
      ctaUrl: absoluteUrl(`/dashboard/bookings/${ctx.bookingId}#review`),
    }),
  };
}

/* -------------------------------------------------------------------------- */
/* Sending                                                                     */
/* -------------------------------------------------------------------------- */
let resendClient: Resend | null = null;
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  resendClient ??= new Resend(key);
  return resendClient;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  settings?: Partial<EmailSettingsInput>;
}): Promise<EmailResult> {
  const resend = getResend();
  if (!resend) return { ok: false, error: "RESEND_API_KEY is not configured" };
  if (!params.to) return { ok: false, error: "Missing recipient" };

  const s = { ...DEFAULT_EMAIL_SETTINGS, ...params.settings };
  try {
    const { data, error } = await resend.emails.send({
      from: `${s.from_name} <${s.from_email}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      ...(s.reply_to ? { replyTo: s.reply_to } : {}),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id ?? null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to send email" };
  }
}

/** Reads admin-configured email settings (platform_settings.email_settings), with safe defaults. */
export async function getEmailSettings(supabase: SupabaseClient): Promise<EmailSettingsInput> {
  try {
    const { data } = await supabase.from("platform_settings").select("setting_value").eq("setting_key", "email_settings").maybeSingle();
    const value = (data?.setting_value ?? {}) as Partial<EmailSettingsInput>;
    return { ...DEFAULT_EMAIL_SETTINGS, ...value };
  } catch {
    return DEFAULT_EMAIL_SETTINGS;
  }
}

type BookingRow = {
  id: string;
  service_id: string;
  booking_date: string;
  duration: number;
  total_price: number;
  status: string;
  notes: string | null;
  service: { title: string } | null;
  seeker: { id: string; full_name: string | null; email: string } | null;
  provider: { id: string; full_name: string | null; email: string } | null;
};

/** Loads everything an email needs for one booking. Pass the admin client for system jobs. */
export async function loadBookingContext(supabase: SupabaseClient, bookingId: string): Promise<BookingEmailContext | null> {
  const { data } = await supabase
    .from("bookings")
    .select(
      "id, service_id, booking_date, duration, total_price, status, notes, service:services(title), seeker:users!bookings_seeker_id_fkey(id, full_name, email), provider:users!bookings_provider_id_fkey(id, full_name, email)",
    )
    .eq("id", bookingId)
    .maybeSingle();
  const row = data as unknown as BookingRow | null;
  if (!row || !row.seeker || !row.provider) return null;
  return {
    bookingId: row.id,
    serviceId: row.service_id,
    serviceTitle: row.service?.title ?? "Service",
    bookingDate: row.booking_date,
    duration: Number(row.duration),
    totalPrice: Number(row.total_price),
    status: row.status,
    notes: row.notes,
    seeker: { id: row.seeker.id, name: row.seeker.full_name ?? row.seeker.email, email: row.seeker.email },
    provider: { id: row.provider.id, name: row.provider.full_name ?? row.provider.email, email: row.provider.email },
  };
}

/* High-level senders (honour admin email settings) ------------------------- */
export async function sendBookingRequestEmail(supabase: SupabaseClient, ctx: BookingEmailContext): Promise<EmailResult> {
  const settings = await getEmailSettings(supabase);
  if (!settings.booking_emails) return { ok: false, error: "Booking emails are disabled" };
  const t = bookingRequestTemplate(ctx);
  return sendEmail({ to: ctx.provider.email, ...t, settings });
}

export async function sendBookingConfirmationEmail(supabase: SupabaseClient, ctx: BookingEmailContext): Promise<EmailResult> {
  const settings = await getEmailSettings(supabase);
  if (!settings.booking_emails) return { ok: false, error: "Booking emails are disabled" };
  const t = bookingConfirmationTemplate(ctx);
  return sendEmail({ to: ctx.seeker.email, ...t, settings });
}

export async function sendBookingStatusEmail(
  supabase: SupabaseClient,
  ctx: BookingEmailContext,
  to: "seeker" | "provider",
  headline: string,
): Promise<EmailResult> {
  const settings = await getEmailSettings(supabase);
  if (!settings.booking_emails) return { ok: false, error: "Booking emails are disabled" };
  const target = to === "seeker" ? ctx.seeker : ctx.provider;
  const t = bookingStatusTemplate(ctx, target.name, headline);
  return sendEmail({ to: target.email, ...t, settings });
}

export async function sendReminderEmail(
  supabase: SupabaseClient,
  ctx: BookingEmailContext,
  to: "seeker" | "provider",
): Promise<EmailResult> {
  const settings = await getEmailSettings(supabase);
  if (!settings.reminder_emails) return { ok: false, error: "Reminder emails are disabled" };
  const target = to === "seeker" ? ctx.seeker : ctx.provider;
  const t = bookingReminderTemplate(ctx, target.name, to);
  return sendEmail({ to: target.email, ...t, settings });
}

export async function sendReviewRequestEmail(supabase: SupabaseClient, ctx: BookingEmailContext): Promise<EmailResult> {
  const settings = await getEmailSettings(supabase);
  if (!settings.review_request_emails) return { ok: false, error: "Review request emails are disabled" };
  const t = reviewRequestTemplate(ctx);
  return sendEmail({ to: ctx.seeker.email, ...t, settings });
}
