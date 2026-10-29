import type { Metadata } from "next";
import type { MessageTemplate } from "@ucommerz/shared";
import { getTranslations } from "next-intl/server";
import { requireProvider } from "@/app/lib/guards";
import { PageHeader } from "@/app/components/PageHeader";
import { TemplateManager } from "@/app/components/TemplateManager";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("DashTemplates");
  return { title: t("metaTitle") };
}

export default async function MessageTemplatesPage() {
  const t = await getTranslations("DashTemplates");
  const { profile, supabase } = await requireProvider("/dashboard/message-templates");
  const { data } = await supabase.from("message_templates").select("*").eq("provider_id", profile.id).order("created_at", { ascending: false });
  return (
    <div>
      <PageHeader title={t("metaTitle")} description={t("pageDesc", { name: "{{name}}", service: "{{service}}" })} />
      <TemplateManager templates={(data as MessageTemplate[] | null) ?? []} />
    </div>
  );
}
