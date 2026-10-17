/**
 * Shared constants & enumerations for UCOMMERZ.
 * String-union types are derived from these tuples so DB CHECK constraints,
 * zod validators and UI stay in sync.
 */
export const APP_NAME = "UCOMMERZ";
export const APP_TAGLINE = "Book trusted experts for every service";

/* ---------- Roles ---------- */
export const USER_ROLES = ["PROVIDER", "SEEKER", "BOTH", "ADMIN", "SUPERADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];
export const SELECTABLE_ROLES = ["SEEKER", "PROVIDER", "BOTH"] as const;
export type SelectableRole = (typeof SELECTABLE_ROLES)[number];
export const PROVIDER_ROLES: readonly UserRole[] = ["PROVIDER", "BOTH"];
export const SEEKER_ROLES: readonly UserRole[] = ["SEEKER", "BOTH"];
/** Staff accounts manage the platform; they have no provider/customer profile of their own (they can only VIEW those dashboards).
 * ADMIN = moderator (users, services, reports, bookings). SUPERADMIN = everything, incl. categories, settings, roles. */
export const STAFF_ROLES: readonly UserRole[] = ["ADMIN", "SUPERADMIN"];
export const isStaffRole = (role: string | null | undefined): boolean => role === "ADMIN" || role === "SUPERADMIN";
export const isSuperAdminRole = (role: string | null | undefined): boolean => role === "SUPERADMIN";

/* ---------- Services ---------- */
export const SERVICE_STATUSES = ["PENDING", "ACTIVE", "INACTIVE", "REJECTED"] as const;
export type ServiceStatus = (typeof SERVICE_STATUSES)[number];
export const PRICE_UNITS = ["hour", "day", "session", "project"] as const;
export type PriceUnit = (typeof PRICE_UNITS)[number];
export const PRICE_UNIT_LABELS: Record<PriceUnit, string> = {
  hour: "per hour",
  day: "per day",
  session: "per session",
  project: "per project",
};

/* ---------- Bookings ---------- */
export const BOOKING_STATUSES = ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "DISPUTED"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PROVIDER_BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: [],
};
export const SEEKER_BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CANCELLED"],
  CONFIRMED: ["CANCELLED", "DISPUTED"],
  IN_PROGRESS: ["DISPUTED"],
  COMPLETED: ["DISPUTED"],
  CANCELLED: [],
  DISPUTED: [],
};

/* ---------- Messages / notifications ---------- */
export const MESSAGE_TYPES = ["TEXT", "IMAGE", "FILE"] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];
export const NOTIFICATION_TYPES = [
  "BOOKING_REQUEST",
  "BOOKING_UPDATE",
  "MESSAGE",
  "REVIEW",
  "SERVICE_UPDATE",
  "REPORT",
  "SYSTEM",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/* ---------- Reports ---------- */
export const REPORT_TARGET_TYPES = ["SERVICE", "REVIEW", "USER", "MESSAGE"] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];
export const REPORT_STATUSES = ["PENDING", "UNDER_REVIEW", "RESOLVED", "DISMISSED"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/* ---------- Provider ---------- */
export const SKILL_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];
export const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/* ---------- Message templates ---------- */
export const TEMPLATE_CATEGORIES = [
  "BOOKING_CONFIRMATION",
  "BOOKING_REMINDER",
  "BOOKING_COMPLETION",
  "CANCELLATION",
  "RESCHEDULE",
  "GENERAL",
  "REVIEW_REQUEST",
] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];
export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  BOOKING_CONFIRMATION: "Booking confirmation",
  BOOKING_REMINDER: "Booking reminder",
  BOOKING_COMPLETION: "Booking completion",
  CANCELLATION: "Cancellation",
  RESCHEDULE: "Reschedule",
  GENERAL: "General",
  REVIEW_REQUEST: "Review request",
};
export const TEMPLATE_VARIABLES = [
  { key: "name", description: "Customer's full name" },
  { key: "provider", description: "Your (provider) name" },
  { key: "service", description: "Service title" },
  { key: "date", description: "Booking date" },
  { key: "time", description: "Booking time" },
  { key: "price", description: "Total price" },
] as const;

/* ---------- Reminders ---------- */
export const REMINDER_TYPES = ["EMAIL", "SMS", "BOTH"] as const;
export type ReminderType = (typeof REMINDER_TYPES)[number];
export const REMINDER_STATUSES = ["PENDING", "SENT", "FAILED"] as const;
export type ReminderStatus = (typeof REMINDER_STATUSES)[number];
export const CANCELLATION_POLICIES = ["FLEXIBLE", "MODERATE", "STRICT"] as const;
export type CancellationPolicy = (typeof CANCELLATION_POLICIES)[number];

/* ---------- Activity ---------- */
export const ACTIVITY_ACTIONS = [
  "LOGIN",
  "PROFILE_UPDATED",
  "SERVICE_CREATED",
  "SERVICE_UPDATED",
  "SERVICE_DELETED",
  "BOOKING_CREATED",
  "BOOKING_STATUS_CHANGED",
  "REVIEW_CREATED",
  "REVIEW_RESPONDED",
  "MESSAGE_SENT",
  "FAVORITE_ADDED",
  "FAVORITE_REMOVED",
  "PACKAGE_CREATED",
  "REPORT_SUBMITTED",
  "SETTINGS_UPDATED",
] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

/* ---------- Limits ---------- */
export const PAGE_SIZE = 12;
export const MAX_UPLOAD_MB = 5;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export const ALLOWED_DOCUMENT_TYPES = [...ALLOWED_IMAGE_TYPES, "application/pdf"] as const;

/* ---------- Storage buckets ---------- */
export const STORAGE_BUCKETS = {
  avatars: "avatars",
  services: "services",
  certificates: "certificates",
  portfolio: "portfolio",
  messages: "message-attachments",
} as const;
export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

/* ---------- Social / admin ---------- */
export const SOCIAL_PLATFORMS = ["facebook", "instagram", "twitter", "linkedin"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
export const PLATFORM_SETTING_GROUPS = ["general", "email", "security", "booking"] as const;
export type PlatformSettingGroup = (typeof PLATFORM_SETTING_GROUPS)[number];
