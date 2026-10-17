import type { Metadata } from "next";
import { requireSuperAdmin } from "@/app/lib/guards";
import { getEmailSettings, isEmailConfigured } from "@/app/lib/email-service";
import { PageHeader } from "@/app/components/PageHeader";
import { EmailSettingsForm } from "@/app/components/AdminSettingsForms";

export const metadata: Metadata = { title: "Email settings" };

export default async function AdminEmailSettingsPage() {
  const { supabase } = await requireSuperAdmin();
  const settings = await getEmailSettings(supabase);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Email settings" description="Transactional emails sent through Resend." />
      <EmailSettingsForm defaults={{ ...settings, reply_to: settings.reply_to ?? "" }} configured={isEmailConfigured()} />
    </div>
  );
}
