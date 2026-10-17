import type { Metadata } from "next";
import type { BookingRules, BusinessHours, Holiday } from "@ucommerz/shared";
import { requireProvider } from "@/app/lib/guards";
import { PageHeader } from "@/app/components/PageHeader";
import { ProviderSettingsForms } from "@/app/components/ProviderSettingsForms";

export const metadata: Metadata = { title: "Booking settings" };

export default async function ProviderSettingsPage() {
  const { profile, supabase } = await requireProvider("/dashboard/provider-settings");
  const [rules, hours, holidays] = await Promise.all([
    supabase.from("booking_rules").select("*").eq("provider_id", profile.id).maybeSingle(),
    supabase.from("business_hours").select("*").eq("provider_id", profile.id),
    supabase.from("holidays").select("*").eq("provider_id", profile.id).order("date", { ascending: true }),
  ]);
  return (
    <div className="max-w-4xl">
      <PageHeader title="Booking settings" description="Availability, business hours and booking rules." />
      <ProviderSettingsForms rules={(rules.data as BookingRules | null) ?? null} hours={(hours.data as BusinessHours[] | null) ?? []} holidays={(holidays.data as Holiday[] | null) ?? []} />
    </div>
  );
}
