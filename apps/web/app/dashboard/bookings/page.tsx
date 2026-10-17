import { isStaffRole } from "@ucommerz/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { BOOKING_STATUSES, PAGE_SIZE, type BookingWithRelations } from "@ucommerz/shared";
import { requireUser } from "@/app/lib/guards";
import { BOOKING_SELECT } from "@/app/lib/booking-select";
import { first, formatCurrency, formatDateTime, parsePositiveInt } from "@/app/lib/utils";
import { serviceImage, avatarOf } from "@/app/lib/media";
import { PageHeader } from "@/app/components/PageHeader";
import { EmptyState } from "@/app/components/EmptyState";
import { StatusBadge } from "@/app/components/StatusBadge";
import { Pagination } from "@/app/components/Pagination";
import { PackageBookingActions } from "@/app/components/PackageBookingActions";
import { Card } from "@/app/components/ui/card";
import { cn } from "@/app/lib/utils";

export const metadata: Metadata = { title: "Bookings" };

type SP = Record<string, string | string[] | undefined>;

export default async function BookingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { profile, supabase } = await requireUser("/dashboard/bookings");
  const tab = first(sp.tab) === "packages" ? "packages" : "services";
  const status = BOOKING_STATUSES.find((s) => s === first(sp.status));
  const view = first(sp.as) === "provider" ? "provider" : first(sp.as) === "customer" ? "customer" : profile.role === "PROVIDER" ? "provider" : "customer";
  const showSwitch = profile.role === "BOTH" || isStaffRole(profile.role);
  const page = parsePositiveInt(first(sp.page), 1);
  const from = (page - 1) * PAGE_SIZE;
  const col = view === "provider" ? "provider_id" : "seeker_id";

  let rows: BookingWithRelations[] = [];
  let total = 0;
  let pkgRows: (Record<string, unknown> & { id: string; status: string; booking_date: string; total_price: number; notes: string | null; pkg: { title: string } | null; seeker: { full_name: string | null } | null; provider: { full_name: string | null } | null })[] = [];

  if (tab === "services") {
    let q = supabase.from("bookings").select(BOOKING_SELECT, { count: "exact" }).eq(col, profile.id).order("booking_date", { ascending: false });
    if (status) q = q.eq("status", status);
    const { data, count } = await q.range(from, from + PAGE_SIZE - 1);
    rows = (data as BookingWithRelations[] | null) ?? [];
    total = count ?? 0;
  } else {
    let q = supabase
      .from("package_bookings")
      .select("*, pkg:packages(title), seeker:users!package_bookings_seeker_id_fkey(full_name), provider:users!package_bookings_provider_id_fkey(full_name)", { count: "exact" })
      .eq(col, profile.id)
      .order("booking_date", { ascending: false });
    if (status) q = q.eq("status", status);
    const { data, count } = await q.range(from, from + PAGE_SIZE - 1);
    pkgRows = (data as unknown as typeof pkgRows | null) ?? [];
    total = count ?? 0;
  }

  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const next = { tab, status: status ?? undefined, as: showSwitch ? view : undefined, ...patch };
    for (const [k, v] of Object.entries(next)) if (v && !(k === "tab" && v === "services")) p.set(k, v);
    const s = p.toString();
    return `/dashboard/bookings${s ? `?${s}` : ""}`;
  };
  const chip = (active: boolean) => cn("rounded-full border px-3 py-1 text-xs font-medium transition", active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground");

  return (
    <div className="space-y-5">
      <PageHeader title="Bookings" description={view === "provider" ? "Requests from your customers." : "Services you've booked."} />
      <div className="flex flex-wrap items-center gap-2">
        {showSwitch && (
          <>
            <Link href={href({ as: "customer", page: undefined })} className={chip(view === "customer")}>As customer</Link>
            <Link href={href({ as: "provider", page: undefined })} className={chip(view === "provider")}>As provider</Link>
            <span className="mx-1 h-4 w-px bg-border" />
          </>
        )}
        <Link href={href({ tab: "services", page: undefined })} className={chip(tab === "services")}>Services</Link>
        <Link href={href({ tab: "packages", page: undefined })} className={chip(tab === "packages")}>Packages</Link>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={href({ status: undefined, page: undefined })} className={chip(!status)}>All</Link>
        {BOOKING_STATUSES.map((s) => (
          <Link key={s} href={href({ status: s, page: undefined })} className={chip(status === s)}>{s.replace("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</Link>
        ))}
      </div>

      {tab === "services" ? (
        rows.length === 0 ? (
          <EmptyState icon={<ClipboardList className="size-5" />} title="No bookings found" description={status ? "Try a different status filter." : view === "customer" ? "Browse services to make your first booking." : "Requests will appear here."} />
        ) : (
          <div className="grid gap-3">
            {rows.map((b) => {
              const other = view === "provider" ? b.seeker : b.provider;
              return (
                <Link key={b.id} href={`/dashboard/bookings/${b.id}`}>
                  <Card className="flex-row items-center gap-4 p-3 transition hover:shadow-md">
                    <img src={b.service ? serviceImage({ images: b.service.images, category: b.service.category }) : avatarOf(null)} alt="" className="size-16 shrink-0 rounded-lg object-cover" loading="lazy" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{b.service?.title ?? "Service removed"}</p>
                      <p className="text-xs text-muted-foreground">{view === "provider" ? "Customer" : "Provider"}: {other?.full_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(b.booking_date)} · {Number(b.duration)}h</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <StatusBadge status={b.status} />
                      <span className="text-sm font-bold text-primary">{formatCurrency(b.total_price)}</span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )
      ) : pkgRows.length === 0 ? (
        <EmptyState icon={<ClipboardList className="size-5" />} title="No package bookings" />
      ) : (
        <div className="grid gap-3">
          {pkgRows.map((b) => (
            <Card key={b.id} className="flex-row flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-semibold">{b.pkg?.title ?? "Package"}</p>
                <p className="text-xs text-muted-foreground">{view === "provider" ? `Customer: ${b.seeker?.full_name ?? "—"}` : `Provider: ${b.provider?.full_name ?? "—"}`} · {formatDateTime(b.booking_date)}</p>
                {b.notes && <p className="mt-1 text-xs text-muted-foreground">“{b.notes}”</p>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2"><StatusBadge status={b.status} /><span className="text-sm font-bold text-primary">{formatCurrency(b.total_price)}</span></div>
                <PackageBookingActions id={b.id} status={b.status} side={view === "provider" ? "provider" : "seeker"} />
              </div>
            </Card>
          ))}
        </div>
      )}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath="/dashboard/bookings" params={{ tab: tab === "packages" ? "packages" : undefined, status, as: showSwitch ? view : undefined }} />
    </div>
  );
}
