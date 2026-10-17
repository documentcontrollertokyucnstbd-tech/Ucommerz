import type { Metadata } from "next";
import Link from "next/link";
import type { BookingWithRelations } from "@ucommerz/shared";
import { requireUser } from "@/app/lib/guards";
import { BOOKING_SELECT } from "@/app/lib/booking-select";
import { fetchActivity } from "@/app/lib/activity-service";
import { safely } from "@/app/lib/queries-extra";
import { formatCurrency, formatDate } from "@/app/lib/utils";
import { PageHeader } from "@/app/components/PageHeader";
import { ActivityHistory } from "@/app/components/ActivityHistory";
import { StatusBadge } from "@/app/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";

export const metadata: Metadata = { title: "History" };

export default async function HistoryPage() {
  const { profile, supabase } = await requireUser("/dashboard/history");
  const [logs, bookings] = await Promise.all([
    safely(() => fetchActivity(supabase, profile.id, { limit: 50 }), []),
    safely(async () => {
      const { data } = await supabase
        .from("bookings")
        .select(BOOKING_SELECT)
        .or(`seeker_id.eq.${profile.id},provider_id.eq.${profile.id}`)
        .in("status", ["COMPLETED", "CANCELLED", "DISPUTED"])
        .order("booking_date", { ascending: false })
        .limit(30);
      return (data as BookingWithRelations[] | null) ?? [];
    }, [] as BookingWithRelations[]),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="History" description="Past bookings and your recent account activity." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Past bookings</CardTitle></CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed or cancelled bookings yet.</p>
            ) : (
              <ul className="divide-y">
                {bookings.map((b) => (
                  <li key={b.id}>
                    <Link href={`/dashboard/bookings/${b.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-muted/40">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{b.service?.title ?? "Service"}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(b.booking_date)} · {formatCurrency(b.total_price)}</p>
                      </div>
                      <StatusBadge status={b.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Activity</CardTitle></CardHeader>
          <CardContent><ActivityHistory logs={logs} /></CardContent>
        </Card>
      </div>
    </div>
  );
}
