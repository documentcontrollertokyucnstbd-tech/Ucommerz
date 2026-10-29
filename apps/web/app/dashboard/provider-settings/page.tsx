import type { Metadata } from "next";
import type { BookingRules, BusinessHours, Holiday } from "@ucommerz/shared";
import { getTranslations } from "next-intl/server";
import { requireProvider } from "@/app/lib/guards";
import { PageHeader } from "@/app/components/PageHeader";
import { ProviderSettingsForms } from "@/app/components/ProviderSettingsForms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("DashSettings");
  return { title: t("metaTitle") };
}

export default async function ProviderSettingsPage() {
  const t = await getTranslations("DashSettings");
  const { profile, supabase } = await requireProvider("/dashboard/provider-settings");
  const [rules, hours, holidays] = await Promise.all([
    supabase.from("booking_rules").select("*").eq("provider_id", profile.id).maybeSingle(),
    supabase.from("business_hours").select("*").eq("provider_id", profile.id),
    supabase.from("holidays").select("*").eq("provider_id", profile.id).order("date", { ascending: true }),
  ]);
  return (
    <div className="max-w-4xl">
      <PageHeader title={t("title")} description={t("desc")} />
      <ProviderSettingsForms rules={(rules.data as BookingRules | null) ?? null} hours={(hours.data as BusinessHours[] | null) ?? []} holidays={(holidays.data as Holiday[] | null) ?? []} />
    </div>
  );
}
