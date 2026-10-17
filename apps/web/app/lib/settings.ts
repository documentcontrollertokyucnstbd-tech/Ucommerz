import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GeneralSettingsInput } from "@ucommerz/shared";

export const DEFAULT_GENERAL_SETTINGS: GeneralSettingsInput = {
  site_name: "UCOMMERZ",
  support_email: "support@ucommerz.com",
  commission_rate: 10,
  allow_registration: true,
  maintenance_mode: false,
  require_service_approval: true,
};

/** Reads general platform settings with safe defaults when rows are missing. */
export async function getGeneralSettings(supabase: SupabaseClient): Promise<GeneralSettingsInput> {
  try {
    const { data } = await supabase.from("platform_settings").select("setting_key, setting_value").eq("setting_group", "general");
    const map = new Map(((data as { setting_key: string; setting_value: unknown }[] | null) ?? []).map((r) => [r.setting_key, r.setting_value]));
    const bool = (k: keyof GeneralSettingsInput, d: boolean) => {
      const v = map.get(k);
      return v === true || v === "true" ? true : v === false || v === "false" ? false : d;
    };
    const str = (k: keyof GeneralSettingsInput, d: string) => (typeof map.get(k) === "string" ? (map.get(k) as string) : d);
    const rate = Number(map.get("commission_rate"));
    return {
      site_name: str("site_name", DEFAULT_GENERAL_SETTINGS.site_name),
      support_email: str("support_email", DEFAULT_GENERAL_SETTINGS.support_email),
      commission_rate: Number.isFinite(rate) ? rate : DEFAULT_GENERAL_SETTINGS.commission_rate,
      allow_registration: bool("allow_registration", true),
      maintenance_mode: bool("maintenance_mode", false),
      require_service_approval: bool("require_service_approval", true),
    };
  } catch {
    return DEFAULT_GENERAL_SETTINGS;
  }
}
