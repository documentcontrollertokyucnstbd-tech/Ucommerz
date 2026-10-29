import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireSuperAdmin } from "@/app/lib/guards";
import { getEmailSettings, isEmailConfigured } from "@/app/lib/email-service";
import { PageHeader } from "@/app/components/PageHeader";
import { EmailSettingsForm } from "@/app/components/AdminSettingsForms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdmEmail");
  return { title: t("metaTitle") };
}

export default async function AdminEmailSettingsPage() {
  const { supabase } = await requireSuperAdmin();
  const t = await getTranslations("AdmEmail");
  const settings = await getEmailSettings(supabase);
  return (
    <div className="max-w-3xl">
      <PageHeader title={t("title")} description={t("pageDescription")} />
      <EmailSettingsForm defaults={{ ...settings, reply_to: settings.reply_to ?? "" }} configured={isEmailConfigured()} />
    </div>
  );
}
