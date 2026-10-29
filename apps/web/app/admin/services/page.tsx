import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { PAGE_SIZE, SERVICE_STATUSES, type ServiceWithProvider } from "@ucommerz/shared";
import { requireAdmin } from "@/app/lib/guards";
import { SERVICE_WITH_PROVIDER } from "@/app/lib/queries";
import { cn, first, parsePositiveInt, sanitizeSearch } from "@/app/lib/utils";
import { getFormat } from "@/app/lib/format-server";
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdmServices");
  return { title: t("metaTitle") };
}

export default async function AdminServicesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const f = await getFormat();
  const sp = await searchParams;
  const t = await getTranslations("AdmServices");
  const tStatus = await getTranslations("Status");
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
      <PageHeader title={t("title")} description={t("count", { count: count ?? 0 })} actions={<><Button asChild size="sm"><Link href="/admin/services/new"><Plus /> {t("newService")}</Link></Button><AdminSearch basePath="/admin/services" params={{ status }} placeholder={t("searchPlaceholder")} /></>} />
      <div className="flex flex-wrap gap-2">
        <Link href={href()} className={chip(!status)}>{t("all")}</Link>
        {SERVICE_STATUSES.map((s) => <Link key={s} href={href(s)} className={chip(status === s)}>{tStatus(s)}</Link>)}
      </div>
      <Card className="py-0">
        <Table>
          <TableHeader><TableRow><TableHead>{t("colService")}</TableHead><TableHead>{t("colProvider")}</TableHead><TableHead>{t("colPrice")}</TableHead><TableHead>{t("colStatus")}</TableHead><TableHead>{t("colCreated")}</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {services.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="max-w-64"><p className="truncate font-medium">{s.title}</p><p className="text-xs text-muted-foreground">{s.category ?? "—"}</p></TableCell>
                <TableCell>{s.provider?.full_name ?? "—"}</TableCell>
                <TableCell>{f.currency(s.price)}</TableCell>
                <TableCell><div className="flex items-center gap-1.5"><StatusBadge status={s.status} />{s.featured && <Badge variant="warning">{t("featured")}</Badge>}</div></TableCell>
                <TableCell className="text-muted-foreground">{f.date(s.created_at)}</TableCell>
                <TableCell className="text-end"><AdminServiceActions id={s.id} status={s.status} featured={s.featured} /></TableCell>
              </TableRow>
            ))}
            {services.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">{t("empty")}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
      <Pagination page={page} total={count ?? 0} pageSize={PAGE_SIZE} basePath="/admin/services" params={{ status, q: q || undefined }} />
    </div>
  );
}
