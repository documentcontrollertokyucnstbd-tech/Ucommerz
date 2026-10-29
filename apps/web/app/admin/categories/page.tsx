import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Category } from "@ucommerz/shared";
import { requireSuperAdmin } from "@/app/lib/guards";
import { PageHeader } from "@/app/components/PageHeader";
import { CategoryManager } from "@/app/components/CategoryManager";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdmCategories");
  return { title: t("metaTitle") };
}

export default async function AdminCategoriesPage() {
  const { supabase } = await requireSuperAdmin();
  const t = await getTranslations("AdmCategories");
  const { data } = await supabase.from("categories").select("*").order("order_position").order("name");
  return (
    <div>
      <PageHeader title={t("title")} description={t("pageDescription")} />
      <CategoryManager categories={(data as Category[] | null) ?? []} />
    </div>
  );
}
