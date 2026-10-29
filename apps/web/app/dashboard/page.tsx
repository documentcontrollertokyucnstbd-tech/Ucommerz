import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardList, DollarSign, Heart, MessageSquare, Plus, Star, Wrench } from "lucide-react";
import type { BookingWithRelations } from "@ucommerz/shared";
import { requireUser, canBook, canProvide } from "@/app/lib/guards";
import { getProviderStats } from "@/app/lib/analytics-service";
import { fetchActivity } from "@/app/lib/activity-service";
import { safely } from "@/app/lib/queries-extra";
import { BOOKING_SELECT } from "@/app/lib/booking-select";
import { first } from "@/app/lib/utils";
import { getFormat } from "@/app/lib/format-server";
import { PageHeader } from "@/app/components/PageHeader";
import { StatCard } from "@/app/components/StatCard";
import { StatusBadge } from "@/app/components/StatusBadge";
import { ActivityHistory } from "@/app/components/ActivityHistory";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("DashHome");
  return { title: t("metaTitle") };
}

export default async function DashboardHome({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const f = await getFormat();
  const t = await getTranslations("DashHome");
  const sp = await searchParams;
  const { profile, supabase } = await requireUser("/dashboard");
  const asProvider = canProvide(profile);
  const asSeeker = canBook(profile);

  const [stats, activity, upcoming, counts] = await Promise.all([
    asProvider ? safely(() => getProviderStats(supabase, profile.id), null) : Promise.resolve(null),
    safely(() => fetchActivity(supabase, profile.id, { limit: 6 }), []),
    safely(async () => {
      const { data } = await supabase
        .from("bookings")
        .select(BOOKING_SELECT)
        .or(`seeker_id.eq.${profile.id},provider_id.eq.${profile.id}`)
        .in("status", ["PENDING", "CONFIRMED", "IN_PROGRESS"])
        .gte("booking_date", new Date(Date.now() - 3600_000).toISOString())
        .order("booking_date", { ascending: true })
        .limit(5);
      return (data as BookingWithRelations[] | null) ?? [];
    }, [] as BookingWithRelations[]),
    safely(async () => {
      const [b, f, m] = await Promise.all([
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("seeker_id", profile.id),
        supabase.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("receiver_id", profile.id).eq("is_read", false),
      ]);
      return { bookings: b.count ?? 0, favorites: f.count ?? 0, unread: m.count ?? 0 };
    }, { bookings: 0, favorites: 0, unread: 0 }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("welcome", { name: profile.full_name?.split(" ")[0] ?? t("welcomeFallback") })}
        description={t("desc")}
        actions={
          <>
            {asSeeker && <Button asChild variant="outline"><Link href="/browse">{t("findServices")}</Link></Button>}
            {asProvider && <Button asChild><Link href="/dashboard/my-services/create"><Plus /> {t("newService")}</Link></Button>}
          </>
        }
      />

      {first(sp.denied) === "1" && (
        <Alert variant="warning">
          <AlertTriangle />
          <AlertTitle>{t("deniedTitle")}</AlertTitle>
          <AlertDescription>
            {t.rich("deniedDesc", { link: (chunks) => <Link href="/profile" className="font-medium underline">{chunks}</Link> })}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats ? (
          <>
            <StatCard label={t("revenueMonth")} value={f.currency(stats.monthRevenue)} hint={t("allTime", { amount: f.currency(stats.totalRevenue) })} icon={<DollarSign className="size-5" />} tone="success" />
            <StatCard label={t("pendingRequests")} value={stats.pendingBookings} hint={t("upcomingCount", { count: stats.upcomingBookings })} icon={<ClipboardList className="size-5" />} tone="warning" />
            <StatCard label={t("activeServices")} value={stats.activeServices} icon={<Wrench className="size-5" />} />
            <StatCard label={t("rating")} value={stats.averageRating.toFixed(1)} hint={t("reviewsCount", { count: stats.totalReviews })} icon={<Star className="size-5" />} tone="info" />
          </>
        ) : (
          <>
            <StatCard label={t("myBookings")} value={counts.bookings} icon={<ClipboardList className="size-5" />} />
            <StatCard label={t("favorites")} value={counts.favorites} icon={<Heart className="size-5" />} tone="destructive" />
            <StatCard label={t("unread")} value={counts.unread} icon={<MessageSquare className="size-5" />} tone="info" />
            <StatCard label={t("upcoming")} value={upcoming.length} icon={<CalendarClock className="size-5" />} tone="success" />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">{t("upcomingBookings")}</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/dashboard/bookings">{t("viewAll")}</Link></Button>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("nothing")} {asSeeker && <Link href="/browse" className="font-medium text-primary hover:underline">{t("browse")}</Link>}</p>
            ) : (
              <ul className="divide-y">
                {upcoming.map((b) => {
                  const other = b.seeker_id === profile.id ? b.provider : b.seeker;
                  return (
                    <li key={b.id}>
                      <Link href={`/dashboard/bookings/${b.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-muted/40">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{b.service?.title ?? t("service")}</p>
                          <p className="text-xs text-muted-foreground">{t("with", { date: f.dateTime(b.booking_date), name: other?.full_name ?? "—" })}</p>
                        </div>
                        <StatusBadge status={b.status} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">{t("recent")}</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/dashboard/history">{t("history")}</Link></Button>
          </CardHeader>
          <CardContent><ActivityHistory logs={activity} /></CardContent>
        </Card>
      </div>
      {stats && stats.completedBookings > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CheckCircle2 className="size-3.5 text-emerald-500" /> {t("completedSoFar", { count: stats.completedBookings })}</p>
      )}
    </div>
  );
}
