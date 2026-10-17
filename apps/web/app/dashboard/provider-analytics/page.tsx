import type { Metadata } from "next";
import { requireProvider } from "@/app/lib/guards";
import { getProviderAnalytics } from "@/app/lib/analytics-service";
import { safely } from "@/app/lib/queries-extra";
import { formatCurrency } from "@/app/lib/utils";
import { PageHeader } from "@/app/components/PageHeader";
import { AnalyticsCharts } from "@/app/components/AnalyticsCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import type { ProviderAnalytics } from "@ucommerz/shared";

export const metadata: Metadata = { title: "Analytics" };

const EMPTY: ProviderAnalytics = { revenueByMonth: [], bookingsByMonth: [], bookingsByCategory: [], topServices: [] };

export default async function ProviderAnalyticsPage() {
  const { profile, supabase } = await requireProvider("/dashboard/provider-analytics");
  const data = await safely(() => getProviderAnalytics(supabase, profile.id, 6), EMPTY);
  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Performance over the last 6 months." />
      <AnalyticsCharts data={data} />
      <Card>
        <CardHeader><CardTitle className="text-base">Top services</CardTitle></CardHeader>
        <CardContent>
          {data.topServices.length === 0 ? <p className="text-sm text-muted-foreground">No data yet.</p> : (
            <ol className="divide-y text-sm">
              {data.topServices.map((s, i) => (
                <li key={s.id} className="flex items-center justify-between py-2.5"><span><span className="mr-2 text-muted-foreground">{i + 1}.</span>{s.title}</span><span className="text-muted-foreground">{s.bookings} bookings · <span className="font-semibold text-foreground">{formatCurrency(s.revenue)}</span></span></li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
