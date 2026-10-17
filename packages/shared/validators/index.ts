import { z } from "zod";
import {
  BOOKING_STATUSES,
  CANCELLATION_POLICIES,
  PRICE_UNITS,
  REMINDER_TYPES,
  REPORT_TARGET_TYPES,
  SELECTABLE_ROLES,
  SERVICE_STATUSES,
  SKILL_LEVELS,
  TEMPLATE_CATEGORIES,
} from "../constants";

/**
 * Schemas avoid `.coerce`, `.default` and `.transform` so input and output
 * types are identical (keeps react-hook-form + zodResolver type-safe).
 * Number inputs use `valueAsNumber` in forms.
 */

const optionalString = (max = 500) =>
  z.string().max(max, `Must be at most ${max} characters`).optional().or(z.literal(""));

const optionalUrl = z.string().url("Enter a valid URL (including https://)").optional().or(z.literal(""));

const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Use HH:MM (24h)");

const strongPassword = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/\d/, "Include a number");

/* ---------- auth ---------- */
export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    full_name: z.string().min(2, "Enter your full name").max(100),
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    phone: optionalString(30),
    role: z.enum(SELECTABLE_ROLES),
    password: strongPassword,
    confirm_password: z.string(),
  })
  .refine((v) => v.password === v.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({ password: strongPassword, confirm_password: z.string() })
  .refine((v) => v.password === v.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/* ---------- profile ---------- */
export const socialLinksSchema = z.object({
  facebook: optionalUrl,
  instagram: optionalUrl,
  twitter: optionalUrl,
  linkedin: optionalUrl,
});

export const profileSchema = z.object({
  full_name: z.string().min(2, "Enter your full name").max(100),
  phone: optionalString(30),
  bio: optionalString(1500),
  location: optionalString(200),
  website: optionalUrl,
  social_links: socialLinksSchema,
});
export type ProfileInput = z.infer<typeof profileSchema>;

/* ---------- services ---------- */
export const serviceSchema = z
  .object({
    title: z.string().min(5, "Title must be at least 5 characters").max(120),
    description: z.string().min(20, "Describe your service (min 20 characters)").max(5000),
    category: z.string().min(1, "Choose a category"),
    sub_category: optionalString(120),
    price: z.number({ invalid_type_error: "Enter a price" }).min(0, "Price cannot be negative").max(1_000_000),
    price_unit: z.enum(PRICE_UNITS),
    min_duration: z.number({ invalid_type_error: "Enter a number" }).min(0.5).max(240).optional(),
    max_duration: z.number({ invalid_type_error: "Enter a number" }).min(0.5).max(240).optional(),
    location: optionalString(200),
    is_remote: z.boolean(),
    is_on_site: z.boolean(),
    service_address: optionalString(300),
    service_radius: z.number({ invalid_type_error: "Enter a number" }).min(0).max(500).optional(),
    status: z.enum(SERVICE_STATUSES).optional(),
  })
  .refine((v) => v.is_remote || v.is_on_site, {
    message: "Select at least one delivery mode",
    path: ["is_on_site"],
  })
  .refine((v) => v.min_duration === undefined || v.max_duration === undefined || v.max_duration >= v.min_duration, {
    message: "Max duration must be ≥ min duration",
    path: ["max_duration"],
  });
export type ServiceInput = z.infer<typeof serviceSchema>;

/* ---------- bookings ---------- */
export const bookingSchema = z.object({
  service_id: z.string().uuid(),
  booking_date: z.string().min(1, "Choose a date and time"),
  duration: z.number({ invalid_type_error: "Enter a duration" }).min(0.5, "Min 0.5 hours").max(240),
  notes: optionalString(1000),
});
export type BookingInput = z.infer<typeof bookingSchema>;

export const bookingStatusSchema = z.object({
  booking_id: z.string().uuid(),
  status: z.enum(BOOKING_STATUSES),
  reason: optionalString(500),
});
export type BookingStatusInput = z.infer<typeof bookingStatusSchema>;

/* ---------- reviews ---------- */
const star = z.number().int().min(1, "Select a rating").max(5);
export const reviewSchema = z.object({
  booking_id: z.string().uuid(),
  rating: star,
  professionalism: star,
  quality: star,
  punctuality: star,
  comment: z.string().min(10, "Share a bit more (min 10 characters)").max(2000),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

export const reviewResponseSchema = z.object({
  review_id: z.string().uuid(),
  response: z.string().min(2, "Write a response").max(1500),
});
export type ReviewResponseInput = z.infer<typeof reviewResponseSchema>;

/* ---------- messaging ---------- */
export const messageSchema = z.object({
  receiver_id: z.string().uuid(),
  content: z.string().min(1, "Message cannot be empty").max(4000),
  booking_id: z.string().uuid().optional(),
});
export type MessageInput = z.infer<typeof messageSchema>;

export const messageTemplateSchema = z.object({
  name: z.string().min(2, "Name is required").max(80),
  subject: optionalString(150),
  content: z.string().min(5, "Template content is required").max(3000),
  category: z.enum(TEMPLATE_CATEGORIES),
  is_active: z.boolean(),
});
export type MessageTemplateInput = z.infer<typeof messageTemplateSchema>;

/* ---------- provider ---------- */
export const skillSchema = z.object({
  skill_name: z.string().min(2, "Skill name is required").max(80),
  skill_level: z.enum(SKILL_LEVELS),
  years_experience: z.number({ invalid_type_error: "Enter years" }).int().min(0).max(60),
});
export type SkillInput = z.infer<typeof skillSchema>;

export const certificationSchema = z.object({
  name: z.string().min(2, "Name is required").max(150),
  issuing_organization: optionalString(150),
  issue_date: optionalString(20),
  expiry_date: optionalString(20),
  certificate_url: optionalUrl,
});
export type CertificationInput = z.infer<typeof certificationSchema>;

export const portfolioSchema = z.object({
  title: z.string().min(2, "Title is required").max(150),
  description: optionalString(1500),
  project_url: optionalUrl,
});
export type PortfolioInput = z.infer<typeof portfolioSchema>;

export const businessHoursDaySchema = z
  .object({
    day_of_week: z.number().int().min(0).max(6),
    is_open: z.boolean(),
    open_time: timeString.optional().or(z.literal("")),
    close_time: timeString.optional().or(z.literal("")),
    break_start: timeString.optional().or(z.literal("")),
    break_end: timeString.optional().or(z.literal("")),
  })
  .refine((v) => !v.is_open || (!!v.open_time && !!v.close_time && v.close_time > v.open_time), {
    message: "Closing time must be after opening time",
    path: ["close_time"],
  });
export const businessHoursSchema = z.object({ days: z.array(businessHoursDaySchema).length(7) });
export type BusinessHoursInput = z.infer<typeof businessHoursSchema>;

export const holidaySchema = z.object({
  date: z.string().min(1, "Choose a date"),
  name: z.string().min(2, "Name is required").max(100),
  is_recurring: z.boolean(),
});
export type HolidayInput = z.infer<typeof holidaySchema>;

export const bookingRulesSchema = z.object({
  min_notice_hours: z.number({ invalid_type_error: "Enter hours" }).int().min(0).max(720),
  max_bookings_per_day: z.number({ invalid_type_error: "Enter a number" }).int().min(1).max(100),
  buffer_time_minutes: z.number({ invalid_type_error: "Enter minutes" }).int().min(0).max(480),
  auto_confirm: z.boolean(),
  cancellation_policy: z.enum(CANCELLATION_POLICIES),
});
export type BookingRulesInput = z.infer<typeof bookingRulesSchema>;

export const reminderSettingsSchema = z
  .object({
    enabled: z.boolean(),
    reminder_hours: z.number({ invalid_type_error: "Enter hours" }).int().min(1).max(168),
    send_email: z.boolean(),
    send_sms: z.boolean(),
    sms_phone: optionalString(30),
  })
  .refine((v) => !v.send_sms || (!!v.sms_phone && v.sms_phone.length >= 6), {
    message: "Enter a phone number for SMS reminders",
    path: ["sms_phone"],
  });
export type ReminderSettingsInput = z.infer<typeof reminderSettingsSchema>;
export const reminderTypeSchema = z.enum(REMINDER_TYPES);

export const customerNoteSchema = z.object({
  customer_id: z.string().uuid(),
  note: z.string().min(2, "Write a note").max(2000),
});
export type CustomerNoteInput = z.infer<typeof customerNoteSchema>;

export const packageSchema = z.object({
  title: z.string().min(3, "Title is required").max(120),
  description: optionalString(2000),
  discount_percentage: z.number({ invalid_type_error: "Enter a number" }).min(0).max(90),
  is_active: z.boolean(),
  service_ids: z.array(z.string().uuid()).min(2, "Bundle at least two services"),
});
export type PackageInput = z.infer<typeof packageSchema>;

/* ---------- reports ---------- */
export const reportSchema = z.object({
  target_type: z.enum(REPORT_TARGET_TYPES),
  target_id: z.string().uuid(),
  reason: z.string().min(2, "Choose a reason"),
  description: optionalString(1500),
});
export type ReportInput = z.infer<typeof reportSchema>;

export const resolveReportSchema = z.object({
  report_id: z.string().uuid(),
  status: z.enum(["UNDER_REVIEW", "RESOLVED", "DISMISSED"]),
  resolution_notes: optionalString(1500),
});
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;

/* ---------- admin ---------- */
export const categorySchema = z.object({
  name: z.string().min(2, "Name is required").max(80),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only"),
  icon: optionalString(40),
  description: optionalString(300),
  parent_id: z.string().uuid().nullable(),
  order_position: z.number({ invalid_type_error: "Enter a number" }).int().min(0).max(1000),
  is_active: z.boolean(),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const emailSettingsSchema = z.object({
  from_name: z.string().min(2).max(80),
  from_email: z.string().email(),
  reply_to: z.string().email().optional().or(z.literal("")),
  booking_emails: z.boolean(),
  reminder_emails: z.boolean(),
  review_request_emails: z.boolean(),
});
export type EmailSettingsInput = z.infer<typeof emailSettingsSchema>;

export const generalSettingsSchema = z.object({
  site_name: z.string().min(2).max(80),
  support_email: z.string().email(),
  commission_rate: z.number({ invalid_type_error: "Enter a number" }).min(0).max(50),
  allow_registration: z.boolean(),
  maintenance_mode: z.boolean(),
  require_service_approval: z.boolean(),
});
export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;

export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
