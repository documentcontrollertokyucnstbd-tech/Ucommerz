import type { Metadata } from "next";
import Link from "next/link";
import { Package, Plus } from "lucide-react";
import type { PackageWithServices } from "@ucommerz/shared";
import { getTranslations } from "next-intl/server";
import { requireProvider } from "@/app/lib/guards";
import { getFormat } from "@/app/lib/format-server";
import { PageHeader } from "@/app/components/PageHeader";
import { EmptyState } from "@/app/components/EmptyState";
import { PackageRowActions } from "@/app/components/PackageRowActions";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("DashPackages");
  return { title: t("metaTitle") };
}

export default async function MyPackagesPage() {
  const f = await getFormat();
  const t = await getTranslations("DashPackages");
  const { profile, supabase } = await requireProvider("/dashboard/my-packages");
  const { data } = await supabase
    .from("packages")
    .select("*, package_services(*, service:services(id, title, price, price_unit))")
    .eq("provider_id", profile.id)
    .order("created_at", { ascending: false });
  const packages = (data as PackageWithServices[] | null) ?? [];
  return (
    <div>
      <PageHeader title={t("title")} description={t("desc")} actions={<Button asChild><Link href="/dashboard/my-packages/create"><Plus /> {t("new")}</Link></Button>} />
      {packages.length === 0 ? (
        <EmptyState icon={<Package className="size-5" />} title={t("emptyTitle")} description={t("emptyDesc")} action={<Button asChild><Link href="/dashboard/my-packages/create">{t("create")}</Link></Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {packages.map((p) => (
            <Card key={p.id}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div><p className="font-semibold">{p.title}</p><p className="text-lg font-bold text-primary">{f.currency(p.price)} {Number(p.discount_percentage) > 0 && <span className="text-xs font-normal text-muted-foreground">{t("off", { percent: Number(p.discount_percentage) })}</span>}</p></div>
                  <Badge variant={p.is_active ? "success" : "muted"}>{p.is_active ? t("active") : t("paused")}</Badge>
                </div>
                <ul className="text-sm text-muted-foreground">{p.package_services.map((ps) => <li key={ps.id}>• {ps.service?.title ?? t("service")}</li>)}</ul>
                <PackageRowActions id={p.id} active={p.is_active} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
