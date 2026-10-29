"use client";

import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { useFormat } from "@/app/lib/use-format";

type Point = { label: string; signups: number; bookings: number; revenue: number };
const AXIS = { fontSize: 12, fill: "currentColor" } as const;
const TOOLTIP = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--popover-foreground)" } };

export function AdminCharts({ data }: { data: Point[] }) {
  const t = useTranslations("AdmCharts");
  const f = useFormat();
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">{t("signupsBookings")}</CardTitle></CardHeader>
        <CardContent className="h-72 text-muted-foreground">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
              <Tooltip {...TOOLTIP} />
              <Legend />
              <Bar dataKey="signups" name={t("signups")} fill="oklch(0.62 0.19 260)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="bookings" name={t("bookings")} fill="oklch(0.7 0.15 160)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">{t("completedRevenue")}</CardTitle></CardHeader>
        <CardContent className="h-72 text-muted-foreground">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v}`} width={52} />
              <Tooltip {...TOOLTIP} formatter={(v) => f.currency(Number(v))} />
              <Line type="monotone" dataKey="revenue" name={t("revenue")} stroke="oklch(0.78 0.16 80)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
