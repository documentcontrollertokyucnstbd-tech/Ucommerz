import { useTranslations } from "next-intl";
import { Badge } from "@/app/components/ui/badge";

type Variant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "muted";

const MAP: Record<string, Variant> = {
  // bookings
  PENDING: "warning",
  CONFIRMED: "info",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "muted",
  DISPUTED: "destructive",
  // services
  ACTIVE: "success",
  INACTIVE: "muted",
  REJECTED: "destructive",
  // reports
  UNDER_REVIEW: "info",
  RESOLVED: "success",
  DISMISSED: "muted",
  // reminders
  SENT: "success",
  FAILED: "destructive",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const t = useTranslations("Status");
  return (
    <Badge variant={MAP[status] ?? "outline"} className={className}>
      {t.has(status)
        ? t(status)
        : status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
    </Badge>
  );
}
