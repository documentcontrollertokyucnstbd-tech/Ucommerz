import type { ActivityAction } from "../constants";

export interface ActivityLog {
  id: string;
  user_id: string;
  action_type: ActivityAction | string;
  target_type: string | null;
  target_id: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface LogActivityInput {
  userId: string;
  action: ActivityAction;
  targetType?: string;
  targetId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}
