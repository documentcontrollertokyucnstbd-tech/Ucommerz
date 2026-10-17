import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, DollarSign, Flag, FolderTree, Plus, ShieldAlert, UserPlus, Users, Wrench } from "lucide-react";
import type { AdminStats } from "@ucommerz/shared";
import { requireAdmin } from "@/app/lib/guards";
import { getAdminStats, getAdminTrends } from "@/app/lib/analytics-service";
import { safely } from "@/app/lib/queries-extra";
import { formatCurrency, formatRelative } from "@/app/lib/utils";
import { PageHeader } from "@/app/components/PageHeader";
import { StatCard } from "@/app/components/StatCard";
import { AdminCharts } from "@/app/components/AdminCharts";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";

export const metadata: Metadata = { title: "Overview" };

const ZERO: AdminStats = { totalUsers: 0, totalProviders: 0, totalServices: 0, pendingServices: 0, totalBookings: 0, completedBookings: 0, pendingReports: 0, platformRevenue: 0 };

export default async function AdminHome({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
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
          That area is only available to a super admin.
        </div>
      )}
      <PageHeader title="Admin overview" description="Platform health and moderation queue." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Users" value={stats.totalUsers} hint={`${stats.totalProviders} providers`} icon={<Users className="size-5" />} />
        <StatCard label="Services" value={stats.totalServices} hint={`${stats.pendingServices} awaiting approval`} icon={<Wrench className="size-5" />} tone="info" />
        <StatCard label="Bookings" value={stats.totalBookings} hint={`${stats.completedBookings} completed`} icon={<ClipboardList className="size-5" />} tone="success" />
        <StatCard label="Gross volume" value={formatCurrency(stats.platformRevenue)} hint="Completed bookings" icon={<DollarSign className="size-5" />} tone="success" />
        <StatCard label="Open reports" value={stats.pendingReports} icon={<Flag className="size-5" />} tone={stats.pendingReports ? "destructive" : "primary"} />
        <StatCard label="Pending services" value={stats.pendingServices} icon={<ShieldAlert className="size-5" />} tone={stats.pendingServices ? "warning" : "primary"} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline"><Link href="/admin/services/new"><Plus /> New service</Link></Button>
        {profile.role === "SUPERADMIN" && <Button asChild size="sm" variant="outline"><Link href="/admin/categories"><FolderTree /> Add category</Link></Button>}
        {profile.role === "SUPERADMIN" && <Button asChild size="sm" variant="outline"><Link href="/admin/users"><UserPlus /> Add user</Link></Button>}
        {stats.pendingServices > 0 && <Button asChild size="sm"><Link href="/admin/services?status=PENDING">Review {stats.pendingServices} service(s)</Link></Button>}
        {stats.pendingReports > 0 && <Button asChild size="sm" variant="outline"><Link href="/admin/reports">Handle {stats.pendingReports} report(s)</Link></Button>}
      </div>
      <AdminCharts data={trends} />
      <Card>
        <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Recent admin actions</CardTitle><Button asChild variant="ghost" size="sm"><Link href="/admin/audit">View all</Link></Button></CardHeader>
        <CardContent>
          {logs.length === 0 ? <p className="text-sm text-muted-foreground">No actions yet.</p> : (
            <ul className="divide-y text-sm">
              {logs.map((l) => <li key={l.id} className="flex items-center justify-between py-2"><span><span className="font-medium">{l.action.replace(/_/g, " ").toLowerCase()}</span> <span className="text-muted-foreground">by {l.admin?.full_name ?? "system"}</span></span><span className="text-xs text-muted-foreground">{formatRelative(l.created_at)}</span></li>)}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
