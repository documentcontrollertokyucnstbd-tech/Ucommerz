import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, ClipboardList, DollarSign, Eye, Star, Users, Wrench } from "lucide-react";
import type { BookingWithRelations } from "@ucommerz/shared";
import { requireProvider } from "@/app/lib/guards";
import { BOOKING_SELECT } from "@/app/lib/booking-select";
import { getProviderStats } from "@/app/lib/analytics-service";
import { safely } from "@/app/lib/queries-extra";
import { formatCurrency, formatDateTime } from "@/app/lib/utils";
import { PageHeader } from "@/app/components/PageHeader";
import { StatCard } from "@/app/components/StatCard";
import { StatusBadge } from "@/app/components/StatusBadge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";

export const metadata: Metadata = { title: "Provider dashboard" };

export default async function ProviderDashboardPage() {
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
              <div className="min-w-0"><p className="truncate text-sm font-medium">{b.service?.title ?? "Service"}</p><p className="text-xs text-muted-foreground">{b.seeker?.full_name ?? "Customer"} · {formatDateTime(b.booking_date)}</p></div>
              <StatusBadge status={b.status} />
            </Link>
          </li>
        ))}
      </ul>
    );

  return (
    <div className="space-y-6">
      <PageHeader title="Provider dashboard" description="Your business at a glance." actions={<Button asChild variant="outline"><Link href="/dashboard/provider-analytics">Full analytics</Link></Button>} />
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Revenue this month" value={formatCurrency(stats.monthRevenue)} hint={`${formatCurrency(stats.totalRevenue)} total`} icon={<DollarSign className="size-5" />} tone="success" />
          <StatCard label="Pending" value={stats.pendingBookings} hint="Need your response" icon={<ClipboardList className="size-5" />} tone="warning" />
          <StatCard label="Upcoming" value={stats.upcomingBookings} icon={<CalendarClock className="size-5" />} tone="info" />
          <StatCard label="Customers" value={stats.totalCustomers} icon={<Users className="size-5" />} />
          <StatCard label="Active services" value={stats.activeServices} icon={<Wrench className="size-5" />} />
          <StatCard label="Rating" value={stats.averageRating.toFixed(1)} hint={`${stats.totalReviews} reviews`} icon={<Star className="size-5" />} tone="warning" />
          <StatCard label="Completed" value={stats.completedBookings} hint={`${stats.cancelledBookings} cancelled`} icon={<ClipboardList className="size-5" />} tone="success" />
          <StatCard label="Profile views" value={stats.profileViews} icon={<Eye className="size-5" />} tone="info" />
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-base">Pending requests</CardTitle></CardHeader><CardContent>{list(pending, "No pending requests.")}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Next up</CardTitle></CardHeader><CardContent>{list(upcoming, "Nothing scheduled.")}</CardContent></Card>
      </div>
    </div>
  );
}
