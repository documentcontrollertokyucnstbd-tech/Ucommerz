import type { Metadata } from "next";
import { requireSuperAdmin } from "@/app/lib/guards";
import { getGeneralSettings } from "@/app/lib/settings";
import { PageHeader } from "@/app/components/PageHeader";
import { GeneralSettingsForm } from "@/app/components/AdminSettingsForms";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const { supabase } = await requireSuperAdmin();
  const settings = await getGeneralSettings(supabase);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" description="Platform configuration." />
      <GeneralSettingsForm defaults={settings} />
    </div>
  );
}
