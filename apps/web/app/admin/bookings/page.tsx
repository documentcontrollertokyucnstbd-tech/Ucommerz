import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { BOOKING_STATUSES, PAGE_SIZE, type BookingWithRelations } from "@ucommerz/shared";
import { requireAdmin } from "@/app/lib/guards";
import { BOOKING_SELECT } from "@/app/lib/booking-select";
import { cn, first, parsePositiveInt } from "@/app/lib/utils";
import { getFormat } from "@/app/lib/format-server";
import { PageHeader } from "@/app/components/PageHeader";
import { Pagination } from "@/app/components/Pagination";
import { StatusBadge } from "@/app/components/StatusBadge";
import { Card } from "@/app/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdmBookings");
  return { title: t("metaTitle") };
}

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const f = await getFormat();
  const sp = await searchParams;
  const t = await getTranslations("AdmBookings");
  const tStatus = await getTranslations("Status");
  const { supabase } = await requireAdmin();
  const status = BOOKING_STATUSES.find((s) => s === first(sp.status));
  const page = parsePositiveInt(first(sp.page), 1);
  const from = (page - 1) * PAGE_SIZE;
  let query = supabase.from("bookings").select(BOOKING_SELECT, { count: "exact" }).order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, count } = await query.range(from, from + PAGE_SIZE - 1);
  const rows = (data as BookingWithRelations[] | null) ?? [];
  const chip = (active: boolean) => cn("rounded-full border px-3 py-1 text-xs font-medium", active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground");

  return (
    <div className="space-y-4">
      <PageHeader title={t("title")} description={t("count", { count: count ?? 0 })} />
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/bookings" className={chip(!status)}>{t("all")}</Link>
        {BOOKING_STATUSES.map((s) => <Link key={s} href={`/admin/bookings?status=${s}`} className={chip(status === s)}>{tStatus(s)}</Link>)}
      </div>
      <Card className="py-0">
        <Table>
          <TableHeader><TableRow><TableHead>{t("colService")}</TableHead><TableHead>{t("colCustomer")}</TableHead><TableHead>{t("colProvider")}</TableHead><TableHead>{t("colWhen")}</TableHead><TableHead>{t("colTotal")}</TableHead><TableHead>{t("colStatus")}</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="max-w-56"><Link href={`/dashboard/bookings/${b.id}`} className="block truncate font-medium hover:underline">{b.service?.title ?? t("removed")}</Link></TableCell>
                <TableCell>{b.seeker?.full_name ?? "—"}</TableCell>
                <TableCell>{b.provider?.full_name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{f.dateTime(b.booking_date)}</TableCell>
                <TableCell>{f.currency(b.total_price)}</TableCell>
                <TableCell><StatusBadge status={b.status} /></TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">{t("empty")}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
      <Pagination page={page} total={count ?? 0} pageSize={PAGE_SIZE} basePath="/admin/bookings" params={{ status }} />
    </div>
  );
}
