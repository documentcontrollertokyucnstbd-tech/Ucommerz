import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireProvider } from "@/app/lib/guards";
import { getCategories } from "@/app/lib/queries";
import { safely } from "@/app/lib/queries-extra";
import { PageHeader } from "@/app/components/PageHeader";
import { ServiceForm } from "@/app/components/ServiceForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("DashServices");
  return { title: t("createMeta") };
}

export default async function CreateServicePage() {
  const t = await getTranslations("DashServices");
  const { profile } = await requireProvider("/dashboard/my-services/create");
  const categories = await safely(getCategories, []);
  return (
    <div className="max-w-3xl">
      <PageHeader title={t("createTitle")} description={t("createDesc")} />
      <ServiceForm categories={categories} userId={profile.id} />
    </div>
  );
}
