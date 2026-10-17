import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AdminStats,
  BookingsPoint,
  CategorySlice,
  ProviderAnalytics,
  ProviderStats,
  RevenuePoint,
} from "@ucommerz/shared";

type BookingLite = {
  id: string;
  service_id: string;
  seeker_id: string;
  booking_date: string;
  total_price: number;
  status: string;
  created_at: string;
  service: { id: string; title: string; category: string | null } | null;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

/** Last `count` months (oldest first), each with a stable key and label. */
export function lastMonths(count: number): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: monthKey(d), label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` });
  }
  return out;
}

async function loadProviderBookings(supabase: SupabaseClient, providerId: string): Promise<BookingLite[]> {
  const { data } = await supabase
    .from("bookings")
    .select("id, service_id, seeker_id, booking_date, total_price, status, created_at, service:services(id, title, category)")
    .eq("provider_id", providerId)
    .order("booking_date", { ascending: false })
    .limit(5000);
  return (data as unknown as BookingLite[]) ?? [];
}

/** Aggregations for the provider dashboard stat cards. */
export async function getProviderStats(supabase: SupabaseClient, providerId: string): Promise<ProviderStats> {
  const [bookings, servicesRes, userRes] = await Promise.all([
    loadProviderBookings(supabase, providerId),
    supabase.from("services").select("id, status, views, total_reviews").eq("provider_id", providerId),
    supabase.from("users").select("rating, total_reviews").eq("id", providerId).maybeSingle(),
  ]);

  const services = (servicesRes.data as { id: string; status: string; views: number }[]) ?? [];
  const now = new Date();
  const thisMonth = monthKey(now);

  let totalRevenue = 0;
  let monthRevenue = 0;
  let pending = 0;
  let upcoming = 0;
  let completed = 0;
  let cancelled = 0;
  const customers = new Set<string>();

  for (const b of bookings) {
    customers.add(b.seeker_id);
    if (b.status === "COMPLETED") {
      completed++;
      const price = Number(b.total_price);
      totalRevenue += price;
      if (monthKey(new Date(b.booking_date)) === thisMonth) monthRevenue += price;
    }
    if (b.status === "PENDING") pending++;
    if (b.status === "CANCELLED") cancelled++;
    if ((b.status === "CONFIRMED" || b.status === "PENDING") && new Date(b.booking_date) >= now) upcoming++;
  }

  return {
    totalRevenue,
    monthRevenue,
    totalBookings: bookings.length,
    pendingBookings: pending,
    upcomingBookings: upcoming,
    completedBookings: completed,
    cancelledBookings: cancelled,
    activeServices: services.filter((s) => s.status === "ACTIVE").length,
    totalCustomers: customers.size,
    averageRating: Number(userRes.data?.rating ?? 0),
    totalReviews: Number(userRes.data?.total_reviews ?? 0),
    profileViews: services.reduce((sum, s) => sum + Number(s.views ?? 0), 0),
  };
}

/** Chart data for the provider analytics page (revenue line, bookings bar, category pie). */
export async function getProviderAnalytics(supabase: SupabaseClient, providerId: string, months = 6): Promise<ProviderAnalytics> {
  const bookings = await loadProviderBookings(supabase, providerId);
  const buckets = lastMonths(months);

  const revenue = new Map<string, number>(buckets.map((b) => [b.key, 0]));
  const counts = new Map<string, { bookings: number; completed: number; cancelled: number }>(
    buckets.map((b) => [b.key, { bookings: 0, completed: 0, cancelled: 0 }]),
  );
  const byCategory = new Map<string, number>();
  const byService = new Map<string, { id: string; title: string; bookings: number; revenue: number }>();

  for (const b of bookings) {
    const key = monthKey(new Date(b.booking_date));
    const c = counts.get(key);
    if (c) {
      c.bookings++;
      if (b.status === "COMPLETED") c.completed++;
      if (b.status === "CANCELLED") c.cancelled++;
    }
    if (b.status === "COMPLETED" && revenue.has(key)) {
      revenue.set(key, (revenue.get(key) ?? 0) + Number(b.total_price));
    }
    if (b.status !== "CANCELLED") {
      const cat = b.service?.category ?? "other";
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + 1);
      if (b.service) {
        const entry = byService.get(b.service.id) ?? { id: b.service.id, title: b.service.title, bookings: 0, revenue: 0 };
        entry.bookings++;
        if (b.status === "COMPLETED") entry.revenue += Number(b.total_price);
        byService.set(b.service.id, entry);
      }
    }
  }

  const revenueByMonth: RevenuePoint[] = buckets.map((b) => ({ label: b.label, revenue: Math.round((revenue.get(b.key) ?? 0) * 100) / 100 }));
  const bookingsByMonth: BookingsPoint[] = buckets.map((b) => ({ label: b.label, ...(counts.get(b.key) ?? { bookings: 0, completed: 0, cancelled: 0 }) }));
  const bookingsByCategory: CategorySlice[] = [...byCategory.entries()]
    .map(([name, value]) => ({ name: name.replace(/-/g, " "), value }))
    .sort((a, b) => b.value - a.value);
  const topServices = [...byService.values()].sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings).slice(0, 5);

  return { revenueByMonth, bookingsByMonth, bookingsByCategory, topServices };
}

/** Platform-wide counters for the admin dashboard. */
export async function getAdminStats(supabase: SupabaseClient): Promise<AdminStats> {
  const count = async (table: string, filter?: (q: any) => any) => {
    let q = supabase.from(table).select("*", { count: "exact", head: true });
    if (filter) q = filter(q);
    const { count: c } = await q;
    return c ?? 0;
  };

  const [totalUsers, totalProviders, totalServices, pendingServices, totalBookings, completedBookings, pendingReports, revenueRows] =
    await Promise.all([
      count("users"),
      count("users", (q) => q.in("role", ["PROVIDER", "BOTH"])),
      count("services"),
      count("services", (q) => q.eq("status", "PENDING")),
      count("bookings"),
      count("bookings", (q) => q.eq("status", "COMPLETED")),
      count("reports", (q) => q.in("status", ["PENDING", "UNDER_REVIEW"])),
      supabase.from("bookings").select("total_price").eq("status", "COMPLETED").limit(20000),
    ]);

  const gross = ((revenueRows.data as { total_price: number }[]) ?? []).reduce((s, r) => s + Number(r.total_price), 0);

  return {
    totalUsers,
    totalProviders,
    totalServices,
    pendingServices,
    totalBookings,
    completedBookings,
    pendingReports,
    platformRevenue: gross,
  };
}

/** Signups and booking volume per month for the admin reports page. */
export async function getAdminTrends(supabase: SupabaseClient, months = 6) {
  const buckets = lastMonths(months);
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);
  const iso = since.toISOString();

  const [users, bookings] = await Promise.all([
    supabase.from("users").select("created_at").gte("created_at", iso).limit(20000),
    supabase.from("bookings").select("created_at, status, total_price").gte("created_at", iso).limit(20000),
  ]);

  const signups = new Map<string, number>(buckets.map((b) => [b.key, 0]));
  const volume = new Map<string, number>(buckets.map((b) => [b.key, 0]));
  const revenue = new Map<string, number>(buckets.map((b) => [b.key, 0]));

  for (const u of (users.data as { created_at: string }[]) ?? []) {
    const k = monthKey(new Date(u.created_at));
    if (signups.has(k)) signups.set(k, (signups.get(k) ?? 0) + 1);
  }
  for (const b of (bookings.data as { created_at: string; status: string; total_price: number }[]) ?? []) {
    const k = monthKey(new Date(b.created_at));
    if (volume.has(k)) volume.set(k, (volume.get(k) ?? 0) + 1);
    if (b.status === "COMPLETED" && revenue.has(k)) revenue.set(k, (revenue.get(k) ?? 0) + Number(b.total_price));
  }

  return buckets.map((b) => ({
    label: b.label,
    signups: signups.get(b.key) ?? 0,
    bookings: volume.get(b.key) ?? 0,
    revenue: Math.round((revenue.get(b.key) ?? 0) * 100) / 100,
  }));
}
