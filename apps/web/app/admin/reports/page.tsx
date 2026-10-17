import type { Metadata } from "next";
import Link from "next/link";
import { Flag } from "lucide-react";
import { PAGE_SIZE, REPORT_STATUSES, type ReportWithReporter } from "@ucommerz/shared";
import { requireAdmin } from "@/app/lib/guards";
import { cn, first, formatDateTime, parsePositiveInt } from "@/app/lib/utils";
import { PageHeader } from "@/app/components/PageHeader";
import { EmptyState } from "@/app/components/EmptyState";
import { Pagination } from "@/app/components/Pagination";
import { StatusBadge } from "@/app/components/StatusBadge";
import { ReportResolver } from "@/app/components/ReportResolver";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent } from "@/app/components/ui/card";

export const metadata: Metadata = { title: "Reports" };

function targetHref(type: string, id: string): string | null {
  if (type === "SERVICE") return `/services/${id}`;
  if (type === "USER") return `/profile/${id}`;
  return null;
}

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const status = REPORT_STATUSES.find((s) => s === first(sp.status));
  const page = parsePositiveInt(first(sp.page), 1);
  const from = (page - 1) * PAGE_SIZE;
  let query = supabase.from("reports").select("*, reporter:users!reports_reporter_id_fkey(id, full_name)", { count: "exact" }).order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  else query = query.in("status", ["PENDING", "UNDER_REVIEW"]);
  const { data, count } = await query.range(from, from + PAGE_SIZE - 1);
  const reports = (data as ReportWithReporter[] | null) ?? [];
  const chip = (active: boolean) => cn("rounded-full border px-3 py-1 text-xs font-medium", active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground");

  return (
    <div className="space-y-4">
      <PageHeader title="Reports" description="Moderate content flagged by users." />
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/reports" className={chip(!status)}>Open</Link>
        {REPORT_STATUSES.map((s) => <Link key={s} href={`/admin/reports?status=${s}`} className={chip(status === s)}>{s.replace("_", " ").toLowerCase()}</Link>)}
      </div>
      {reports.length === 0 ? (
        <EmptyState icon={<Flag className="size-5" />} title="Nothing here" description="No reports match this filter." />
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const href = targetHref(r.target_type, r.target_id);
            return (
              <Card key={r.id}>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{r.target_type.toLowerCase()}</Badge><span className="font-medium">{r.reason}</span></div>
                      <p className="text-xs text-muted-foreground">Reported by {r.reporter?.full_name ?? "unknown"} · {formatDateTime(r.created_at)}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  {r.description && <p className="rounded-lg bg-muted/50 p-3 text-sm">{r.description}</p>}
                  {href && <Link href={href} className="text-sm font-medium text-primary hover:underline">View reported {r.target_type.toLowerCase()} →</Link>}
                  <ReportResolver reportId={r.id} status={r.status} notes={r.resolution_notes} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <Pagination page={page} total={count ?? 0} pageSize={PAGE_SIZE} basePath="/admin/reports" params={{ status }} />
    </div>
  );
}
