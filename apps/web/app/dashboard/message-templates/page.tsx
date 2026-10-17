import type { Metadata } from "next";
import type { MessageTemplate } from "@ucommerz/shared";
import { requireProvider } from "@/app/lib/guards";
import { PageHeader } from "@/app/components/PageHeader";
import { TemplateManager } from "@/app/components/TemplateManager";

export const metadata: Metadata = { title: "Message templates" };

export default async function MessageTemplatesPage() {
  const { profile, supabase } = await requireProvider("/dashboard/message-templates");
  const { data } = await supabase.from("message_templates").select("*").eq("provider_id", profile.id).order("created_at", { ascending: false });
  return (
    <div>
      <PageHeader title="Message templates" description="Reusable replies with variables like {{name}} and {{service}}." />
      <TemplateManager templates={(data as MessageTemplate[] | null) ?? []} />
    </div>
  );
}
