import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ClipboardList, DollarSign, Flag, FolderTree, Plus, ShieldAlert, UserPlus, Users, Wrench } from "lucide-react";
import type { AdminStats } from "@ucommerz/shared";
import { requireAdmin } from "@/app/lib/guards";
import { getAdminStats, getAdminTrends } from "@/app/lib/analytics-service";
import { safely } from "@/app/lib/queries-extra";
import { getFormat } from "@/app/lib/format-server";
import { PageHeader } from "@/app/components/PageHeader";
import { StatCard } from "@/app/components/StatCard";
import { AdminCharts } from "@/app/components/AdminCharts";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdmHome");
  return { title: t("metaTitle") };
}

const ZERO: AdminStats = { totalUsers: 0, totalProviders: 0, totalServices: 0, pendingServices: 0, totalBookings: 0, completedBookings: 0, pendingReports: 0, platformRevenue: 0 };

export default async function AdminHome({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const f = await getFormat();
  const sp = await searchParams;
  const t = await getTranslations("AdmHome");
  const { supabase, profile } = await requireAdmin();
  const [stats, trends, logs] = await Promise.all([
    safely(() => getAdminStats(supabase), ZERO),
    safely(() => getAdminTrends(supabase, 6), []),
    safely(async () => ((await supabase.from("admin_logs").select("id, action, target_type, created_at, admin:users!admin_logs_admin_id_fkey(full_name)").order("created_at", { ascending: false }).limit(8)).data ?? []) as unknown as { id: string; action: string; target_type: string | null; created_at: string; admin: { full_name: string | null } | null }[], []),
  ]);
  return (
    <div className="space-y-6">
      {sp.denied && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {t("denied")}
        </div>
      )}
      <PageHeader title={t("title")} description={t("description")} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label={t("users")} value={stats.totalUsers} hint={t("providersHint", { count: stats.totalProviders })} icon={<Users className="size-5" />} />
        <StatCard label={t("services")} value={stats.totalServices} hint={t("awaitingHint", { count: stats.pendingServices })} icon={<Wrench className="size-5" />} tone="info" />
        <StatCard label={t("bookings")} value={stats.totalBookings} hint={t("completedHint", { count: stats.completedBookings })} icon={<ClipboardList className="size-5" />} tone="success" />
        <StatCard label={t("grossVolume")} value={f.currency(stats.platformRevenue)} hint={t("grossHint")} icon={<DollarSign className="size-5" />} tone="success" />
        <StatCard label={t("openReports")} value={stats.pendingReports} icon={<Flag className="size-5" />} tone={stats.pendingReports ? "destructive" : "primary"} />
        <StatCard label={t("pendingServices")} value={stats.pendingServices} icon={<ShieldAlert className="size-5" />} tone={stats.pendingServices ? "warning" : "primary"} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline"><Link href="/admin/services/new"><Plus /> {t("newService")}</Link></Button>
        {profile.role === "SUPERADMIN" && <Button asChild size="sm" variant="outline"><Link href="/admin/categories"><FolderTree /> {t("addCategory")}</Link></Button>}
        {profile.role === "SUPERADMIN" && <Button asChild size="sm" variant="outline"><Link href="/admin/users"><UserPlus /> {t("addUser")}</Link></Button>}
        {stats.pendingServices > 0 && <Button asChild size="sm"><Link href="/admin/services?status=PENDING">{t("reviewServices", { count: stats.pendingServices })}</Link></Button>}
        {stats.pendingReports > 0 && <Button asChild size="sm" variant="outline"><Link href="/admin/reports">{t("handleReports", { count: stats.pendingReports })}</Link></Button>}
      </div>
      <AdminCharts data={trends} />
      <Card>
        <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">{t("recentActions")}</CardTitle><Button asChild variant="ghost" size="sm"><Link href="/admin/audit">{t("viewAll")}</Link></Button></CardHeader>
        <CardContent>
          {logs.length === 0 ? <p className="text-sm text-muted-foreground">{t("noActions")}</p> : (
            <ul className="divide-y text-sm">
              {logs.map((l) => <li key={l.id} className="flex items-center justify-between py-2"><span><span className="font-medium">{l.action.replace(/_/g, " ").toLowerCase()}</span> <span className="text-muted-foreground">{t("by", { name: l.admin?.full_name ?? t("system") })}</span></span><span className="text-xs text-muted-foreground">{f.relative(l.created_at)}</span></li>)}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
