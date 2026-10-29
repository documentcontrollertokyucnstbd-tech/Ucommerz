"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send } from "lucide-react";
import { emailSettingsSchema, generalSettingsSchema, type EmailSettingsInput, type GeneralSettingsInput } from "@ucommerz/shared";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/ui/form";
import { saveEmailSettingsAction, saveGeneralSettingsAction, sendTestEmailAction } from "@/app/actions/admin";
import { toastAction } from "@/app/lib/toast-action";

export function GeneralSettingsForm({ defaults }: { defaults: GeneralSettingsInput }) {
  const router = useRouter();
  const t = useTranslations("AdmSettings");
  const form = useForm<GeneralSettingsInput>({ resolver: zodResolver(generalSettingsSchema), defaultValues: defaults });
  async function onSubmit(v: GeneralSettingsInput) {
    const res = await toastAction(saveGeneralSettingsAction(v));
    if (res.ok) router.refresh();
  }
  const toggle = (name: "allow_registration" | "maintenance_mode" | "require_service_approval", label: string, hint: string) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem className="flex items-center justify-between gap-4 rounded-lg border p-3 space-y-0">
        <div><FormLabel>{label}</FormLabel><FormDescription>{hint}</FormDescription></div>
        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
      </FormItem>
    )} />
  );
  return (
    <Card>
      <CardHeader><CardTitle>{t("general")}</CardTitle><CardDescription>{t("generalDesc")}</CardDescription></CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="site_name" render={({ field }) => (<FormItem><FormLabel>{t("siteName")}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="support_email" render={({ field }) => (<FormItem><FormLabel>{t("supportEmail")}</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="commission_rate" render={({ field }) => (<FormItem><FormLabel>{t("commission")}</FormLabel><FormControl><Input type="number" min={0} max={50} step="0.5" {...field} value={Number.isFinite(field.value) ? field.value : ""} onChange={(e) => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            {toggle("require_service_approval", t("requireApproval"), t("requireApprovalHint"))}
            {toggle("allow_registration", t("allowRegistration"), t("allowRegistrationHint"))}
            {toggle("maintenance_mode", t("maintenance"), t("maintenanceHint"))}
            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="animate-spin" />} {t("saveSettings")}</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export function EmailSettingsForm({ defaults, configured }: { defaults: EmailSettingsInput; configured: boolean }) {
  const router = useRouter();
  const t = useTranslations("AdmEmail");
  const [testing, setTesting] = useState(false);
  const form = useForm<EmailSettingsInput>({ resolver: zodResolver(emailSettingsSchema), defaultValues: defaults });
  async function onSubmit(v: EmailSettingsInput) {
    const res = await toastAction(saveEmailSettingsAction(v));
    if (res.ok) router.refresh();
  }
  const toggle = (name: "booking_emails" | "reminder_emails" | "review_request_emails", label: string) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem className="flex items-center justify-between rounded-lg border p-3 space-y-0"><FormLabel>{label}</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
    )} />
  );
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>{t("senderTemplates")}</CardTitle><CardDescription>{configured ? t("resendConfigured") : t("resendMissing")}</CardDescription></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="from_name" render={({ field }) => (<FormItem><FormLabel>{t("fromName")}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="from_email" render={({ field }) => (<FormItem><FormLabel>{t("fromEmail")}</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormDescription>{t("fromEmailHint")}</FormDescription><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="reply_to" render={({ field }) => (<FormItem><FormLabel>{t("replyTo")}</FormLabel><FormControl><Input type="email" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              {toggle("booking_emails", t("bookingEmails"))}
              {toggle("reminder_emails", t("reminderEmails"))}
              {toggle("review_request_emails", t("reviewEmails"))}
              <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="animate-spin" />} {t("save")}</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("testTitle")}</CardTitle><CardDescription>{t("testDesc")}</CardDescription></CardHeader>
        <CardContent>
          <Button type="button" variant="outline" disabled={testing} onClick={async () => { setTesting(true); await toastAction(sendTestEmailAction()); setTesting(false); }}>
            {testing ? <Loader2 className="animate-spin" /> : <Send />} {t("sendTest")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
