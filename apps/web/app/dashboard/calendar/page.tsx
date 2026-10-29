import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BookingWithRelations } from "@ucommerz/shared";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/app/lib/guards";
import { BOOKING_SELECT } from "@/app/lib/booking-select";
import { cn, first } from "@/app/lib/utils";
import { getFormat } from "@/app/lib/format-server";
import { PageHeader } from "@/app/components/PageHeader";
import { StatusBadge } from "@/app/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("DashCalendar");
  return { title: t("metaTitle") };
}

const pad = (n: number) => String(n).padStart(2, "0");
const key = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const DOT: Record<string, string> = {
  PENDING: "bg-amber-500",
  CONFIRMED: "bg-sky-500",
  IN_PROGRESS: "bg-sky-500",
  COMPLETED: "bg-emerald-500",
  CANCELLED: "bg-muted-foreground/50",
  DISPUTED: "bg-destructive",
};

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const f = await getFormat();
  const t = await getTranslations("DashCalendar");
  const sp = await searchParams;
  const { profile, supabase } = await requireUser("/dashboard/calendar");

  const now = new Date();
  const m = /^(\d{4})-(\d{2})$/.exec(first(sp.month) ?? "");
  const year = m ? Number(m[1]) : now.getFullYear();
  const month = m ? Math.min(11, Math.max(0, Number(m[2]) - 1)) : now.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(first(sp.day) ?? "") ? (first(sp.day) as string) : key(now);

  const { data } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .or(`seeker_id.eq.${profile.id},provider_id.eq.${profile.id}`)
    .gte("booking_date", new Date(start.getTime() - 86400_000).toISOString())
    .lt("booking_date", new Date(end.getTime() + 86400_000).toISOString())
    .order("booking_date", { ascending: true });
  const bookings = ((data as BookingWithRelations[] | null) ?? []).filter((b) => b.status !== "CANCELLED");

  const byDay = new Map<string, BookingWithRelations[]>();
  for (const b of bookings) {
    const k = key(new Date(b.booking_date));
    byDay.set(k, [...(byDay.get(k) ?? []), b]);
  }

  const cells: (Date | null)[] = [...Array(start.getDay()).fill(null)];
  for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7) cells.push(null);

  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const mk = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const dayList = byDay.get(selected) ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} description={t("desc")} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="font-display text-lg">{start.toLocaleDateString(f.tag, { month: "long", year: "numeric" })}</CardTitle>
            <div className="flex gap-1">
              <Link href={`/dashboard/calendar?month=${mk(prev)}`} aria-label={t("prev")} className="rounded-md border p-1.5 hover:bg-accent"><ChevronLeft className="size-4 rtl-flip" /></Link>
              <Link href="/dashboard/calendar" className="rounded-md border px-2.5 py-1 text-xs hover:bg-accent">{t("today")}</Link>
              <Link href={`/dashboard/calendar?month=${mk(next)}`} aria-label={t("next")} className="rounded-md border p-1.5 hover:bg-accent"><ChevronRight className="size-4 rtl-flip" /></Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
              {[0, 1, 2, 3, 4, 5, 6].map((d) => <div key={d} className="py-1">{t(`weekdays.${d}`)}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, i) => {
                if (!d) return <div key={i} className="aspect-square" />;
                const k = key(d);
                const list = byDay.get(k) ?? [];
                const isToday = k === key(now);
                return (
                  <Link
                    key={i}
                    href={`/dashboard/calendar?month=${mk(start)}&day=${k}`}
                    aria-label={t("dayAria", { date: d.toDateString(), count: list.length })}
                    className={cn("flex aspect-square flex-col items-center justify-start rounded-lg border p-1 text-sm transition hover:bg-accent", k === selected && "border-primary bg-primary/5", isToday && "font-bold text-primary")}
                  >
                    <span>{d.getDate()}</span>
                    <span className="mt-auto flex flex-wrap justify-center gap-0.5">
                      {list.slice(0, 3).map((b) => <span key={b.id} className={cn("size-1.5 rounded-full", DOT[b.status])} />)}
                      {list.length > 3 && <span className="text-[9px] leading-none">+{list.length - 3}</span>}
                    </span>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{new Date(`${selected}T00:00`).toLocaleDateString(f.tag, { weekday: "long", month: "long", day: "numeric" })}</CardTitle></CardHeader>
          <CardContent>
            {dayList.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("none")}</p>
            ) : (
              <ul className="space-y-3">
                {dayList.map((b) => (
                  <li key={b.id}>
                    <Link href={`/dashboard/bookings/${b.id}`} className="block rounded-lg border p-3 transition hover:bg-accent">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{b.service?.title ?? t("service")}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("timeLine", { time: new Date(b.booking_date).toLocaleTimeString(f.tag, { hour: "numeric", minute: "2-digit" }), hours: Number(b.duration), amount: f.currency(b.total_price) })}
                          </p>
                          <p className="text-xs text-muted-foreground">{t("with", { name: (b.seeker_id === profile.id ? b.provider : b.seeker)?.full_name ?? "—" })}</p>
                        </div>
                        <StatusBadge status={b.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
