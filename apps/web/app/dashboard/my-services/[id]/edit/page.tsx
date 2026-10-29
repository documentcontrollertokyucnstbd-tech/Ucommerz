import { isStaffRole } from "@ucommerz/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Service } from "@ucommerz/shared";
import { getTranslations } from "next-intl/server";
import { requireProvider } from "@/app/lib/guards";
import { getCategories } from "@/app/lib/queries";
import { safely } from "@/app/lib/queries-extra";
import { isUuid } from "@/app/lib/utils";
import { PageHeader } from "@/app/components/PageHeader";
import { ServiceForm } from "@/app/components/ServiceForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("DashServices");
  return { title: t("editMeta") };
}

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("DashServices");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { profile, supabase } = await requireProvider(`/dashboard/my-services/${id}/edit`);
  const [categories, { data }] = await Promise.all([safely(getCategories, []), supabase.from("services").select("*").eq("id", id).maybeSingle()]);
  const service = data as Service | null;
  if (!service || (service.provider_id !== profile.id && !isStaffRole(profile.role))) notFound();
  return (
    <div className="max-w-3xl">
      <PageHeader title={t("editTitle")} description={service.title} />
      <ServiceForm categories={categories} userId={profile.id} service={service} />
    </div>
  );
}
