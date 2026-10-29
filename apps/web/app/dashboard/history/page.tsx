import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { BookingWithRelations } from "@ucommerz/shared";
import { requireUser } from "@/app/lib/guards";
import { BOOKING_SELECT } from "@/app/lib/booking-select";
import { fetchActivity } from "@/app/lib/activity-service";
import { safely } from "@/app/lib/queries-extra";
import { getFormat } from "@/app/lib/format-server";
import { PageHeader } from "@/app/components/PageHeader";
import { ActivityHistory } from "@/app/components/ActivityHistory";
import { StatusBadge } from "@/app/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("DashHistory");
  return { title: t("metaTitle") };
}

export default async function HistoryPage() {
  const f = await getFormat();
  const t = await getTranslations("DashHistory");
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
      <PageHeader title={t("title")} description={t("desc")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">{t("past")}</CardTitle></CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("none")}</p>
            ) : (
              <ul className="divide-y">
                {bookings.map((b) => (
                  <li key={b.id}>
                    <Link href={`/dashboard/bookings/${b.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-muted/40">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{b.service?.title ?? t("service")}</p>
                        <p className="text-xs text-muted-foreground">{f.date(b.booking_date)} · {f.currency(b.total_price)}</p>
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
          <CardHeader><CardTitle className="text-base">{t("activity")}</CardTitle></CardHeader>
          <CardContent><ActivityHistory logs={logs} /></CardContent>
        </Card>
      </div>
    </div>
  );
}
