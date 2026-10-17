import type { ReportStatus, ReportTargetType } from "../constants";
import type { UserSummary } from "./user.types";

export interface AdminLog {
  id: string;
  admin_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export type AdminLogWithAdmin = AdminLog & { admin: Pick<UserSummary, "id" | "full_name"> | null };

export interface PlatformSetting {
  id: string;
  setting_key: string;
  setting_value: unknown;
  setting_group: string;
  description: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ReportWithReporter = Report & { reporter: Pick<UserSummary, "id" | "full_name"> | null };

export interface ReportReason {
  id: string;
  reason: string;
  target_type: ReportTargetType;
  is_active: boolean;
  created_at: string;
}

export interface AdminStats {
  totalUsers: number;
  totalProviders: number;
  totalServices: number;
  pendingServices: number;
  totalBookings: number;
  completedBookings: number;
  pendingReports: number;
  platformRevenue: number;
}
