import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Flag } from "lucide-react";
import { PAGE_SIZE, REPORT_STATUSES, type ReportWithReporter } from "@ucommerz/shared";
import { requireAdmin } from "@/app/lib/guards";
import { cn, first, parsePositiveInt } from "@/app/lib/utils";
import { getFormat } from "@/app/lib/format-server";
import { PageHeader } from "@/app/components/PageHeader";
import { EmptyState } from "@/app/components/EmptyState";
import { Pagination } from "@/app/components/Pagination";
import { StatusBadge } from "@/app/components/StatusBadge";
import { ReportResolver } from "@/app/components/ReportResolver";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent } from "@/app/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdmReports");
  return { title: t("metaTitle") };
}

function targetHref(type: string, id: string): string | null {
  if (type === "SERVICE") return `/services/${id}`;
  if (type === "USER") return `/profile/${id}`;
  return null;
}

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const f = await getFormat();
  const sp = await searchParams;
  const t = await getTranslations("AdmReports");
  const tStatus = await getTranslations("Status");
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
      <PageHeader title={t("title")} description={t("description")} />
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/reports" className={chip(!status)}>{t("open")}</Link>
        {REPORT_STATUSES.map((s) => <Link key={s} href={`/admin/reports?status=${s}`} className={chip(status === s)}>{tStatus(s)}</Link>)}
      </div>
      {reports.length === 0 ? (
        <EmptyState icon={<Flag className="size-5" />} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const href = targetHref(r.target_type, r.target_id);
            return (
              <Card key={r.id}>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{t.has(`target.${r.target_type}`) ? t(`target.${r.target_type}`) : r.target_type.toLowerCase()}</Badge><span className="font-medium">{r.reason}</span></div>
                      <p className="text-xs text-muted-foreground">{t("reportedBy", { name: r.reporter?.full_name ?? t("unknown"), date: f.dateTime(r.created_at) })}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  {r.description && <p className="rounded-lg bg-muted/50 p-3 text-sm">{r.description}</p>}
                  {href && <Link href={href} className="text-sm font-medium text-primary hover:underline">{t.has(`viewTarget.${r.target_type}`) ? t(`viewTarget.${r.target_type}`) : t("viewTargetGeneric")} <span className="rtl-flip inline-block" aria-hidden="true">→</span></Link>}
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
