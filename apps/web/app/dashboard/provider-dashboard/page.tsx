import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, ClipboardList, DollarSign, Eye, Star, Users, Wrench } from "lucide-react";
import type { BookingWithRelations } from "@ucommerz/shared";
import { getTranslations } from "next-intl/server";
import { requireProvider } from "@/app/lib/guards";
import { BOOKING_SELECT } from "@/app/lib/booking-select";
import { getProviderStats } from "@/app/lib/analytics-service";
import { safely } from "@/app/lib/queries-extra";
import { getFormat } from "@/app/lib/format-server";
import { PageHeader } from "@/app/components/PageHeader";
import { StatCard } from "@/app/components/StatCard";
import { StatusBadge } from "@/app/components/StatusBadge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("DashProviderHome");
  return { title: t("metaTitle") };
}

export default async function ProviderDashboardPage() {
  const f = await getFormat();
  const t = await getTranslations("DashProviderHome");
  const { profile, supabase } = await requireProvider("/dashboard/provider-dashboard");
  const [stats, pending, upcoming] = await Promise.all([
    safely(() => getProviderStats(supabase, profile.id), null),
    safely(async () => ((await supabase.from("bookings").select(BOOKING_SELECT).eq("provider_id", profile.id).eq("status", "PENDING").order("created_at", { ascending: false }).limit(5)).data as BookingWithRelations[] | null) ?? [], [] as BookingWithRelations[]),
    safely(async () => ((await supabase.from("bookings").select(BOOKING_SELECT).eq("provider_id", profile.id).in("status", ["CONFIRMED", "IN_PROGRESS"]).gte("booking_date", new Date().toISOString()).order("booking_date").limit(5)).data as BookingWithRelations[] | null) ?? [], [] as BookingWithRelations[]),
  ]);

  const list = (rows: BookingWithRelations[], empty: string) =>
    rows.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : (
      <ul className="divide-y">
        {rows.map((b) => (
          <li key={b.id}>
            <Link href={`/dashboard/bookings/${b.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-muted/40">
              <div className="min-w-0"><p className="truncate text-sm font-medium">{b.service?.title ?? t("service")}</p><p className="text-xs text-muted-foreground">{b.seeker?.full_name ?? t("customer")} · {f.dateTime(b.booking_date)}</p></div>
              <StatusBadge status={b.status} />
            </Link>
          </li>
        ))}
      </ul>
    );

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("desc")} actions={<Button asChild variant="outline"><Link href="/dashboard/provider-analytics">{t("fullAnalytics")}</Link></Button>} />
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={t("revenueMonth")} value={f.currency(stats.monthRevenue)} hint={t("totalAmount", { amount: f.currency(stats.totalRevenue) })} icon={<DollarSign className="size-5" />} tone="success" />
          <StatCard label={t("pending")} value={stats.pendingBookings} hint={t("needResponse")} icon={<ClipboardList className="size-5" />} tone="warning" />
          <StatCard label={t("upcoming")} value={stats.upcomingBookings} icon={<CalendarClock className="size-5" />} tone="info" />
          <StatCard label={t("customers")} value={stats.totalCustomers} icon={<Users className="size-5" />} />
          <StatCard label={t("activeServices")} value={stats.activeServices} icon={<Wrench className="size-5" />} />
          <StatCard label={t("rating")} value={stats.averageRating.toFixed(1)} hint={t("reviewsCount", { count: stats.totalReviews })} icon={<Star className="size-5" />} tone="warning" />
          <StatCard label={t("completed")} value={stats.completedBookings} hint={t("cancelledCount", { count: stats.cancelledBookings })} icon={<ClipboardList className="size-5" />} tone="success" />
          <StatCard label={t("profileViews")} value={stats.profileViews} icon={<Eye className="size-5" />} tone="info" />
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-base">{t("pendingRequests")}</CardTitle></CardHeader><CardContent>{list(pending, t("noPending"))}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">{t("nextUp")}</CardTitle></CardHeader><CardContent>{list(upcoming, t("nothing"))}</CardContent></Card>
      </div>
    </div>
  );
}
