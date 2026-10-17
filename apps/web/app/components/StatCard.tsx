import type { ReactNode } from "react";
import { Card, CardContent } from "@/app/components/ui/card";
import { cn } from "@/app/lib/utils";

export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = "primary",
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: string;
  tone?: "primary" | "success" | "warning" | "info" | "destructive";
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    info: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <Card className="py-5">
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {icon && <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", tones[tone])}>{icon}</div>}
      </CardContent>
    </Card>
  );
}
