import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireSuperAdmin } from "@/app/lib/guards";
import { getGeneralSettings } from "@/app/lib/settings";
import { PageHeader } from "@/app/components/PageHeader";
import { GeneralSettingsForm } from "@/app/components/AdminSettingsForms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdmSettings");
  return { title: t("metaTitle") };
}

export default async function AdminSettingsPage() {
  const { supabase } = await requireSuperAdmin();
  const t = await getTranslations("AdmSettings");
  const settings = await getGeneralSettings(supabase);
  return (
    <div className="max-w-3xl">
      <PageHeader title={t("title")} description={t("pageDescription")} />
      <GeneralSettingsForm defaults={settings} />
    </div>
  );
}
