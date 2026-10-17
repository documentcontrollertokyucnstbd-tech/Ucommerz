import type { Metadata } from "next";
import type { Category } from "@ucommerz/shared";
import { requireSuperAdmin } from "@/app/lib/guards";
import { PageHeader } from "@/app/components/PageHeader";
import { CategoryManager } from "@/app/components/CategoryManager";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const { supabase } = await requireSuperAdmin();
  const { data } = await supabase.from("categories").select("*").order("order_position").order("name");
  return (
    <div>
      <PageHeader title="Categories" description="Two-level hierarchy: categories and sub-categories." />
      <CategoryManager categories={(data as Category[] | null) ?? []} />
    </div>
  );
}
