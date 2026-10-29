import type { Metadata } from "next";
import type { Service } from "@ucommerz/shared";
import { getTranslations } from "next-intl/server";
import { requireProvider } from "@/app/lib/guards";
import { PageHeader } from "@/app/components/PageHeader";
import { PackageForm } from "@/app/components/PackageForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("DashPackages");
  return { title: t("createMeta") };
}

export default async function CreatePackagePage() {
  const t = await getTranslations("DashPackages");
  const { profile, supabase } = await requireProvider("/dashboard/my-packages/create");
  const { data } = await supabase.from("services").select("id, title, price, price_unit").eq("provider_id", profile.id).eq("status", "ACTIVE").order("title");
  return (
    <div className="max-w-2xl">
      <PageHeader title={t("createTitle")} description={t("createDesc")} />
      <PackageForm services={(data as Pick<Service, "id" | "title" | "price" | "price_unit">[] | null) ?? []} />
    </div>
  );
}
