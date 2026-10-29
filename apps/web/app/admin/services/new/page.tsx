import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { requireAdmin } from "@/app/lib/guards";
import { getCategories } from "@/app/lib/queries";
import { safely } from "@/app/lib/queries-extra";
import { first } from "@/app/lib/utils";
import { PageHeader } from "@/app/components/PageHeader";
import { ServiceForm } from "@/app/components/ServiceForm";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdmNewService");
  return { title: t("metaTitle") };
}

export default async function AdminNewServicePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const t = await getTranslations("AdmNewService");
  const { profile, supabase } = await requireAdmin();
  const providerId = first(sp.provider);

  const { data: providers } = await supabase
    .from("users")
    .select("id, full_name, email")
    .in("role", ["PROVIDER", "BOTH"])
    .eq("is_active", true)
    .order("full_name");
  const list = (providers as { id: string; full_name: string | null; email: string }[] | null) ?? [];
  const chosen = list.find((p) => p.id === providerId);
  const categories = chosen ? await safely(getCategories, []) : [];

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader title={t("title")} description={t("description")} />
      <Card className="p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="grid min-w-60 flex-1 gap-1.5">
            <label htmlFor="provider" className="text-sm font-medium">{t("provider")}</label>
            <select id="provider" name="provider" defaultValue={chosen?.id ?? ""} required className="h-9 rounded-md border bg-background px-3 text-sm">
              <option value="" disabled>{t("selectProvider")}</option>
              {list.map((p) => <option key={p.id} value={p.id}>{p.full_name ?? p.email} — {p.email}</option>)}
            </select>
          </div>
          <Button type="submit" variant="outline">{chosen ? t("changeProvider") : t("continue")}</Button>
        </form>
        {list.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">{t.rich("noProviders", { link: (chunks) => <Link href="/admin/users" className="font-medium text-primary hover:underline">{chunks}</Link> })}</p>
        )}
      </Card>
      {chosen && <ServiceForm categories={categories} userId={profile.id} providerId={chosen.id} />}
    </div>
  );
}
