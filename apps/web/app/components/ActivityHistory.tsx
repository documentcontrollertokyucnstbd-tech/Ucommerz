import {
  Bell,
  CalendarCheck,
  FileText,
  Flag,
  Heart,
  LogIn,
  MessageSquare,
  Package,
  Pencil,
  Settings,
  Star,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { ActivityLog } from "@ucommerz/shared";
import { formatDateTime, formatRelative } from "@/app/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  LOGIN: LogIn,
  PROFILE_UPDATED: Pencil,
  SERVICE_CREATED: Wrench,
  SERVICE_UPDATED: Wrench,
  SERVICE_DELETED: Wrench,
  BOOKING_CREATED: CalendarCheck,
  BOOKING_STATUS_CHANGED: CalendarCheck,
  REVIEW_CREATED: Star,
  REVIEW_RESPONDED: Star,
  MESSAGE_SENT: MessageSquare,
  FAVORITE_ADDED: Heart,
  FAVORITE_REMOVED: Heart,
  PACKAGE_CREATED: Package,
  REPORT_SUBMITTED: Flag,
  SETTINGS_UPDATED: Settings,
};

function label(action: string) {
  return action.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** Vertical timeline of the user's recent activity (rows from activity_logs). */
export function ActivityHistory({ logs, empty = "No activity yet." }: { logs: ActivityLog[]; empty?: string }) {
  if (logs.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ol className="relative space-y-4 border-l pl-6">
      {logs.map((l) => {
        const Icon = ICONS[l.action_type] ?? (l.action_type === "NOTIFICATION" ? Bell : FileText);
        return (
          <li key={l.id} className="relative">
            <span className="absolute -left-[34px] flex size-7 items-center justify-center rounded-full border bg-card text-primary">
              <Icon className="size-3.5" />
            </span>
            <p className="text-sm font-medium">{l.description ?? label(l.action_type)}</p>
            <p className="text-xs text-muted-foreground" title={formatDateTime(l.created_at)}>
              {label(l.action_type)} · {formatRelative(l.created_at)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
