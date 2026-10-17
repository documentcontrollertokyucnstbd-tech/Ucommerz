"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ProviderAnalytics } from "@ucommerz/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { formatCurrency } from "@/app/lib/utils";

const COLORS = ["oklch(0.62 0.19 260)", "oklch(0.7 0.15 160)", "oklch(0.78 0.16 80)", "oklch(0.65 0.2 25)", "oklch(0.65 0.18 310)", "oklch(0.7 0.12 210)"];
const AXIS = { fontSize: 12, fill: "currentColor" } as const;
const TOOLTIP = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--popover-foreground)" } };

export function AnalyticsCharts({ data }: { data: ProviderAnalytics }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Revenue</CardTitle></CardHeader>
        <CardContent className="h-72 text-muted-foreground">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.revenueByMonth} margin={{ left: 0, right: 12, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v}`} width={52} />
              <Tooltip {...TOOLTIP} formatter={(v) => formatCurrency(Number(v))} />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke={COLORS[0]} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Bookings</CardTitle></CardHeader>
        <CardContent className="h-72 text-muted-foreground">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.bookingsByMonth} margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
              <Tooltip {...TOOLTIP} />
              <Legend />
              <Bar dataKey="completed" name="Completed" stackId="a" fill={COLORS[1]} />
              <Bar dataKey="bookings" name="Total" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
              <Bar dataKey="cancelled" name="Cancelled" fill={COLORS[3]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">By category</CardTitle></CardHeader>
        <CardContent className="h-72">
          {data.bookingsByCategory.length === 0 ? (
            <p className="pt-8 text-center text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.bookingsByCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {data.bookingsByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip {...TOOLTIP} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
