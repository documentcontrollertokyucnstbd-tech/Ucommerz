import type { Metadata } from "next";
import type { Reminder } from "@ucommerz/shared";
import { getTranslations } from "next-intl/server";
import { requireProvider } from "@/app/lib/guards";
import { DEFAULT_REMINDER_PREFS } from "@/app/lib/reminders";
import { getFormat } from "@/app/lib/format-server";
import { PageHeader } from "@/app/components/PageHeader";
import { ReminderSettingsForm } from "@/app/components/ReminderSettingsForm";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("DashReminders");
  return { title: t("metaTitle") };
}

export default async function ReminderSettingsPage() {
  const f = await getFormat();
  const t = await getTranslations("DashReminders");
  const ts = await getTranslations("Status");
  const { profile, supabase } = await requireProvider("/dashboard/reminder-settings");
  const { data } = await supabase.from("reminder_settings").select("*").eq("provider_id", profile.id).maybeSingle();
  const { data: recent } = await supabase
    .from("reminders")
    .select("*, booking:bookings!inner(provider_id)")
    .eq("booking.provider_id", profile.id)
    .order("reminder_time", { ascending: false })
    .limit(10);
  const prefs = { ...DEFAULT_REMINDER_PREFS, ...(data ?? {}) };
  const reminders = (recent as (Reminder & { booking: unknown })[] | null) ?? [];

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={t("title")} description={t("desc")} />
      <ReminderSettingsForm defaults={{ enabled: prefs.enabled, reminder_hours: prefs.reminder_hours, send_email: prefs.send_email, send_sms: prefs.send_sms, sms_phone: prefs.sms_phone ?? "" }} />
      <Card>
        <CardHeader><CardTitle className="text-base">{t("recent")}</CardTitle></CardHeader>
        <CardContent>
          {reminders.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("none")}</p>
          ) : (
            <ul className="divide-y text-sm">
              {reminders.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2">
                  <span>{f.dateTime(r.reminder_time)} <span className="text-muted-foreground">· {r.recipient_email ?? "—"}</span></span>
                  <Badge variant={r.status === "SENT" ? "success" : r.status === "FAILED" ? "destructive" : "warning"}>{ts(r.status)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
