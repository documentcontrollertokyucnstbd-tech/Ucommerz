import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ClipboardList, DollarSign, Eye, Heart, MessageSquare, Star, Users, Wrench } from "lucide-react";
import { PROVIDER_ROLES, SEEKER_ROLES, type BookingWithRelations, type UserProfile } from "@ucommerz/shared";
import { requireAdmin } from "@/app/lib/guards";
import { BOOKING_SELECT } from "@/app/lib/booking-select";
import { getProviderStats } from "@/app/lib/analytics-service";
import { safely } from "@/app/lib/queries-extra";
import { cn, first } from "@/app/lib/utils";
import { getFormat } from "@/app/lib/format-server";
import { PageHeader } from "@/app/components/PageHeader";
import { StatCard } from "@/app/components/StatCard";
import { StatusBadge } from "@/app/components/StatusBadge";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdmUserDetail");
  return { title: t("metaTitle") };
}

type Row = { id: string; title: string; status: string; price: number; rating: number; total_reviews: number };

/**
 * Read-only "view as" screen for staff.
 * ADMIN (moderator) can see a provider's dashboard; SUPERADMIN can see both the provider and the customer dashboard.
 */
export default async function AdminUserDashboardPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const f = await getFormat();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { profile: viewer, supabase } = await requireAdmin();
  const t = await getTranslations("AdmUserDetail");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data } = await supabase.from("users").select("*").eq("id", id).maybeSingle();
  const target = data as UserProfile | null;
  if (!target) notFound();

  const isSuper = viewer.role === "SUPERADMIN";
  const canProviderView = PROVIDER_ROLES.includes(target.role);
  const canCustomerView = isSuper && SEEKER_ROLES.includes(target.role);
  if (!canProviderView && !canCustomerView) {
    return (
      <div className="space-y-4">
        <PageHeader title={target.full_name ?? target.email} description={t("noDashboard")} actions={<Button asChild variant="outline" size="sm"><Link href="/admin/users">{t("backToUsers")}</Link></Button>} />
        <p className="text-sm text-muted-foreground">
          {["ADMIN", "SUPERADMIN"].includes(target.role) ? t("staffNote") : t("moderatorNote")}
        </p>
      </div>
    );
  }
  const requested = first(sp.view);
  const view: "provider" | "customer" = requested === "customer" && canCustomerView ? "customer" : requested === "provider" && canProviderView ? "provider" : canProviderView ? "provider" : "customer";

  const tab = (v: "provider" | "customer", label: string) => (
    <Link href={`/admin/users/${id}?view=${v}`} className={cn("rounded-full border px-3 py-1 text-xs font-medium", view === v ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground")}>{label}</Link>
  );

  const list = (rows: BookingWithRelations[], empty: string, who: "seeker" | "provider") =>
    rows.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : (
      <ul className="divide-y">
        {rows.map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{b.service?.title ?? t("serviceFallback")}</p>
              <p className="text-xs text-muted-foreground">{(who === "seeker" ? b.seeker?.full_name : b.provider?.full_name) ?? "—"} · {f.dateTime(b.booking_date)}</p>
            </div>
            <StatusBadge status={b.status} />
          </li>
        ))}
      </ul>
    );

  const header = (
    <PageHeader
      title={target.full_name ?? target.email}
      description={t(view === "provider" ? "viewingProvider" : "viewingCustomer", { email: target.email })}
      actions={<Button asChild variant="outline" size="sm"><Link href="/admin/users">{t("backToUsers")}</Link></Button>}
    />
  );
  const tabs = (
    <div className="flex flex-wrap items-center gap-2">
      {canProviderView && tab("provider", t("providerDashboard"))}
      {canCustomerView && tab("customer", t("customerDashboard"))}
      <Badge variant="muted">{t("readOnly")}</Badge>
      {!target.is_active && <Badge variant="destructive">{t("suspended")}</Badge>}
    </div>
  );

  if (view === "provider") {
    const [stats, pending, upcoming, services] = await Promise.all([
      safely(() => getProviderStats(supabase, id), null),
      safely(async () => ((await supabase.from("bookings").select(BOOKING_SELECT).eq("provider_id", id).eq("status", "PENDING").order("created_at", { ascending: false }).limit(5)).data as BookingWithRelations[] | null) ?? [], [] as BookingWithRelations[]),
      safely(async () => ((await supabase.from("bookings").select(BOOKING_SELECT).eq("provider_id", id).in("status", ["CONFIRMED", "IN_PROGRESS"]).gte("booking_date", new Date().toISOString()).order("booking_date", { ascending: true }).limit(5)).data as BookingWithRelations[] | null) ?? [], [] as BookingWithRelations[]),
      safely(async () => ((await supabase.from("services").select("id, title, status, price, rating, total_reviews").eq("provider_id", id).order("created_at", { ascending: false }).limit(8)).data as Row[] | null) ?? [], [] as Row[]),
    ]);
    return (
      <div className="space-y-6">
        {header}
        {tabs}
        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t("revenueMonth")} value={f.currency(stats.monthRevenue)} hint={t("totalHint", { amount: f.currency(stats.totalRevenue) })} icon={<DollarSign className="size-5" />} tone="success" />
            <StatCard label={t("pending")} value={stats.pendingBookings} icon={<ClipboardList className="size-5" />} tone="warning" />
            <StatCard label={t("upcoming")} value={stats.upcomingBookings} icon={<CalendarClock className="size-5" />} tone="info" />
            <StatCard label={t("customers")} value={stats.totalCustomers} icon={<Users className="size-5" />} />
            <StatCard label={t("activeServices")} value={stats.activeServices} icon={<Wrench className="size-5" />} />
            <StatCard label={t("rating")} value={stats.averageRating.toFixed(1)} hint={t("reviewsHint", { count: stats.totalReviews })} icon={<Star className="size-5" />} tone="warning" />
            <StatCard label={t("completed")} value={stats.completedBookings} hint={t("cancelledHint", { count: stats.cancelledBookings })} icon={<ClipboardList className="size-5" />} tone="success" />
            <StatCard label={t("profileViews")} value={stats.profileViews} icon={<Eye className="size-5" />} tone="info" />
          </div>
        )}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card><CardHeader><CardTitle className="text-base">{t("pendingRequests")}</CardTitle></CardHeader><CardContent>{list(pending, t("noPending"), "seeker")}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">{t("nextUp")}</CardTitle></CardHeader><CardContent>{list(upcoming, t("nothingScheduled"), "seeker")}</CardContent></Card>
        </div>
        <Card>
          <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">{t("services")}</CardTitle><Button asChild variant="ghost" size="sm"><Link href="/admin/services">{t("manageAll")}</Link></Button></CardHeader>
          <CardContent>
            {services.length === 0 ? <p className="text-sm text-muted-foreground">{t("noServices")}</p> : (
              <ul className="divide-y">
                {services.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0"><p className="truncate text-sm font-medium">{s.title}</p><p className="text-xs text-muted-foreground">{f.currency(s.price)} · {Number(s.rating).toFixed(1)} ★ ({s.total_reviews})</p></div>
                    <StatusBadge status={s.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const [counts, upcoming, recent] = await Promise.all([
    safely(async () => {
      const [b, f, m] = await Promise.all([
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("seeker_id", id),
        supabase.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", id),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("receiver_id", id).eq("is_read", false),
      ]);
      return { bookings: b.count ?? 0, favorites: f.count ?? 0, unread: m.count ?? 0 };
    }, { bookings: 0, favorites: 0, unread: 0 }),
    safely(async () => ((await supabase.from("bookings").select(BOOKING_SELECT).eq("seeker_id", id).in("status", ["PENDING", "CONFIRMED", "IN_PROGRESS"]).gte("booking_date", new Date(Date.now() - 3600_000).toISOString()).order("booking_date", { ascending: true }).limit(5)).data as BookingWithRelations[] | null) ?? [], [] as BookingWithRelations[]),
    safely(async () => ((await supabase.from("bookings").select(BOOKING_SELECT).eq("seeker_id", id).order("created_at", { ascending: false }).limit(8)).data as BookingWithRelations[] | null) ?? [], [] as BookingWithRelations[]),
  ]);
  return (
    <div className="space-y-6">
      {header}
      {tabs}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("bookings")} value={counts.bookings} icon={<ClipboardList className="size-5" />} />
        <StatCard label={t("favorites")} value={counts.favorites} icon={<Heart className="size-5" />} tone="destructive" />
        <StatCard label={t("unreadMessages")} value={counts.unread} icon={<MessageSquare className="size-5" />} tone="info" />
        <StatCard label={t("upcoming")} value={upcoming.length} icon={<CalendarClock className="size-5" />} tone="success" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-base">{t("upcomingBookings")}</CardTitle></CardHeader><CardContent>{list(upcoming, t("nothingScheduled"), "provider")}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">{t("recentBookings")}</CardTitle></CardHeader><CardContent>{list(recent, t("noBookings"), "provider")}</CardContent></Card>
      </div>
    </div>
  );
}
