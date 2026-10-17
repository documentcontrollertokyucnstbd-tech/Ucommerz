import type { Metadata } from "next";
import Link from "next/link";
import { PAGE_SIZE, SERVICE_STATUSES, type ServiceWithProvider } from "@ucommerz/shared";
import { requireAdmin } from "@/app/lib/guards";
import { SERVICE_WITH_PROVIDER } from "@/app/lib/queries";
import { cn, first, formatCurrency, formatDate, parsePositiveInt, sanitizeSearch } from "@/app/lib/utils";
import { PageHeader } from "@/app/components/PageHeader";
import { Pagination } from "@/app/components/Pagination";
import { AdminSearch } from "@/app/components/AdminSearch";
import { StatusBadge } from "@/app/components/StatusBadge";
import { AdminServiceActions } from "@/app/components/AdminServiceActions";
import { Plus } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Card } from "@/app/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";

export const metadata: Metadata = { title: "Services" };

export default async function AdminServicesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const q = sanitizeSearch(first(sp.q) ?? "");
  const status = SERVICE_STATUSES.find((s) => s === first(sp.status));
  const page = parsePositiveInt(first(sp.page), 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase.from("services").select(SERVICE_WITH_PROVIDER, { count: "exact" }).order("created_at", { ascending: false });
  if (q) query = query.or(`title.ilike.%${q}%,category.ilike.%${q}%`);
  if (status) query = query.eq("status", status);
  const { data, count } = await query.range(from, from + PAGE_SIZE - 1);
  const services = (data as ServiceWithProvider[] | null) ?? [];

  const chip = (active: boolean) => cn("rounded-full border px-3 py-1 text-xs font-medium", active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground");
  const href = (s?: string) => `/admin/services${s || q ? `?${new URLSearchParams({ ...(s ? { status: s } : {}), ...(q ? { q } : {}) }).toString()}` : ""}`;

  return (
    <div className="space-y-4">
      <PageHeader title="Services" description={`${count ?? 0} services`} actions={<><Button asChild size="sm"><Link href="/admin/services/new"><Plus /> New service</Link></Button><AdminSearch basePath="/admin/services" params={{ status }} placeholder="Title or category" /></>} />
      <div className="flex flex-wrap gap-2">
        <Link href={href()} className={chip(!status)}>All</Link>
        {SERVICE_STATUSES.map((s) => <Link key={s} href={href(s)} className={chip(status === s)}>{s.toLowerCase()}</Link>)}
      </div>
      <Card className="py-0">
        <Table>
          <TableHeader><TableRow><TableHead>Service</TableHead><TableHead>Provider</TableHead><TableHead>Price</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {services.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="max-w-64"><p className="truncate font-medium">{s.title}</p><p className="text-xs text-muted-foreground">{s.category ?? "—"}</p></TableCell>
                <TableCell>{s.provider?.full_name ?? "—"}</TableCell>
                <TableCell>{formatCurrency(s.price)}</TableCell>
                <TableCell><div className="flex items-center gap-1.5"><StatusBadge status={s.status} />{s.featured && <Badge variant="warning">Featured</Badge>}</div></TableCell>
                <TableCell className="text-muted-foreground">{formatDate(s.created_at)}</TableCell>
                <TableCell className="text-right"><AdminServiceActions id={s.id} status={s.status} featured={s.featured} /></TableCell>
              </TableRow>
            ))}
            {services.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No services found.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
      <Pagination page={page} total={count ?? 0} pageSize={PAGE_SIZE} basePath="/admin/services" params={{ status, q: q || undefined }} />
    </div>
  );
}
