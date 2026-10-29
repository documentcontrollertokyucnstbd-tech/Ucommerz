import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { AdminLogWithAdmin } from "@ucommerz/shared";
import { PAGE_SIZE } from "@ucommerz/shared";
import { requireAdmin } from "@/app/lib/guards";
import { first, parsePositiveInt } from "@/app/lib/utils";
import { getFormat } from "@/app/lib/format-server";
import { PageHeader } from "@/app/components/PageHeader";
import { Pagination } from "@/app/components/Pagination";
import { Card } from "@/app/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdmAudit");
  return { title: t("metaTitle") };
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const f = await getFormat();
  const sp = await searchParams;
  const t = await getTranslations("AdmAudit");
  const { supabase } = await requireAdmin();
  const page = parsePositiveInt(first(sp.page), 1);
  const size = PAGE_SIZE * 2;
  const from = (page - 1) * size;
  const { data, count } = await supabase
    .from("admin_logs")
    .select("*, admin:users!admin_logs_admin_id_fkey(id, full_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + size - 1);
  const logs = (data as AdminLogWithAdmin[] | null) ?? [];
  return (
    <div className="space-y-4">
      <PageHeader title={t("title")} description={t("description")} />
      <Card className="py-0">
        <Table>
          <TableHeader><TableRow><TableHead>{t("colWhen")}</TableHead><TableHead>{t("colAdmin")}</TableHead><TableHead>{t("colAction")}</TableHead><TableHead>{t("colTarget")}</TableHead><TableHead>{t("colIp")}</TableHead></TableRow></TableHeader>
          <TableBody>
            {logs.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-muted-foreground">{f.dateTime(l.created_at)}</TableCell>
                <TableCell>{l.admin?.full_name ?? t("system")}</TableCell>
                <TableCell className="font-medium">{l.action.replace(/_/g, " ").toLowerCase()}</TableCell>
                <TableCell className="max-w-48 truncate text-muted-foreground">{l.target_type ? `${l.target_type}${l.target_id ? ` · ${String(l.target_id).slice(0, 8)}` : ""}` : "—"}</TableCell>
                <TableCell className="text-muted-foreground">{l.ip_address ?? "—"}</TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">{t("empty")}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
      <Pagination page={page} total={count ?? 0} pageSize={size} basePath="/admin/audit" />
    </div>
  );
}
