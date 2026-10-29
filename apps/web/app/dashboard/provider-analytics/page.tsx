import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireProvider } from "@/app/lib/guards";
import { getProviderAnalytics } from "@/app/lib/analytics-service";
import { safely } from "@/app/lib/queries-extra";
import { getFormat } from "@/app/lib/format-server";
import { PageHeader } from "@/app/components/PageHeader";
import { AnalyticsCharts } from "@/app/components/AnalyticsCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import type { ProviderAnalytics } from "@ucommerz/shared";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("DashAnalytics");
  return { title: t("metaTitle") };
}

const EMPTY: ProviderAnalytics = { revenueByMonth: [], bookingsByMonth: [], bookingsByCategory: [], topServices: [] };

export default async function ProviderAnalyticsPage() {
  const f = await getFormat();
  const t = await getTranslations("DashAnalytics");
  const { profile, supabase } = await requireProvider("/dashboard/provider-analytics");
  const data = await safely(() => getProviderAnalytics(supabase, profile.id, 6), EMPTY);
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("desc")} />
      <AnalyticsCharts data={data} />
      <Card>
        <CardHeader><CardTitle className="text-base">{t("top")}</CardTitle></CardHeader>
        <CardContent>
          {data.topServices.length === 0 ? <p className="text-sm text-muted-foreground">{t("none")}</p> : (
            <ol className="divide-y text-sm">
              {data.topServices.map((s, i) => (
                <li key={s.id} className="flex items-center justify-between py-2.5"><span><span className="me-2 text-muted-foreground">{i + 1}.</span>{s.title}</span><span className="text-muted-foreground">{t("topRow", { count: s.bookings })}<span className="font-semibold text-foreground">{f.currency(s.revenue)}</span></span></li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
