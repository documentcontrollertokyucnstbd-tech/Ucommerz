import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCategoryTree } from "@/app/lib/queries";
import { getCurrentProfile } from "@/app/lib/guards";
import { Button } from "@/app/components/ui/button";
import { safely } from "@/app/lib/queries-extra";
import { CategoryIcon } from "@/app/lib/category-icons";
import { PageHeader } from "@/app/components/PageHeader";
import { EmptyState } from "@/app/components/EmptyState";
import { Stagger, StaggerItem } from "@/app/components/motion";
import type { CategoryNode } from "@ucommerz/shared";
import { LayoutGrid } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");
  return { title: t("categoriesTitle"), description: t("categoriesDesc"), alternates: { canonical: "/categories" } };
}

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const t = await getTranslations("Categories");
  const th = await getTranslations("Home");
  const tree = await safely(getCategoryTree, [] as CategoryNode[]);
  const me = await safely(getCurrentProfile, null);
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={me?.role === "SUPERADMIN" ? <Button asChild size="sm"><Link href="/admin/categories">{t("manage")}</Link></Button> : undefined}
      />
      {tree.length === 0 ? (
        <EmptyState icon={<LayoutGrid className="size-5" />} title={t("emptyTitle")} description={t("emptyBody")} />
      ) : (
        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tree.map((c) => (
            <StaggerItem key={c.id}>
              <div className="glass-card h-full rounded-xl border p-5 transition hover:shadow-lg">
                <Link href={`/categories/${c.slug}`} className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CategoryIcon name={c.icon} className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{th("serviceCount", { count: c.service_count })}</span>
                  </span>
                </Link>
                {c.description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
                {c.children.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {c.children.slice(0, 8).map((s) => (
                      <li key={s.id}>
                        <Link href={`/categories/${s.slug}`} className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-primary">
                          {s.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
