"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  CANCELLATION_POLICIES,
  DAYS_OF_WEEK,
  bookingRulesSchema,
  businessHoursSchema,
  holidaySchema,
  type BookingRules,
  type BookingRulesInput,
  type BusinessHours,
  type BusinessHoursInput,
  type Holiday,
  type HolidayInput,
} from "@ucommerz/shared";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { addHolidayAction, deleteHolidayAction, saveBookingRulesAction, saveBusinessHoursAction } from "@/app/actions/provider";
import { toastAction } from "@/app/lib/toast-action";
import { useFormat } from "@/app/lib/use-format";

const t5 = (v: string | null | undefined) => (v ? v.slice(0, 5) : "");
const intInput = (e: React.ChangeEvent<HTMLInputElement>) => e.target.valueAsNumber;

/* ------------------------------------------------------------------ rules */
function RulesForm({ rules }: { rules: BookingRules | null }) {
  const t = useTranslations("DashSettings.rules");
  const tp = useTranslations("DashSettings.policies");
  const router = useRouter();
  const form = useForm<BookingRulesInput>({
    resolver: zodResolver(bookingRulesSchema),
    defaultValues: {
      min_notice_hours: rules?.min_notice_hours ?? 24,
      max_bookings_per_day: rules?.max_bookings_per_day ?? 8,
      buffer_time_minutes: rules?.buffer_time_minutes ?? 15,
      auto_confirm: rules?.auto_confirm ?? false,
      cancellation_policy: rules?.cancellation_policy ?? "FLEXIBLE",
    },
  });
  async function onSubmit(v: BookingRulesInput) {
    const res = await toastAction(saveBookingRulesAction(v));
    if (res.ok) router.refresh();
  }
  const num = (name: "min_notice_hours" | "max_bookings_per_day" | "buffer_time_minutes", label: string, hint: string) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem><FormLabel>{label}</FormLabel><FormControl><Input type="number" min={0} {...field} value={Number.isFinite(field.value) ? field.value : ""} onChange={(e) => field.onChange(intInput(e))} /></FormControl><FormDescription>{hint}</FormDescription><FormMessage /></FormItem>
    )} />
  );
  return (
    <Card>
      <CardHeader><CardTitle>{t("title")}</CardTitle><CardDescription>{t("desc")}</CardDescription></CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
            {num("min_notice_hours", t("minNotice"), t("minNoticeHint"))}
            {num("max_bookings_per_day", t("maxPerDay"), t("maxPerDayHint"))}
            {num("buffer_time_minutes", t("buffer"), t("bufferHint"))}
            <FormField control={form.control} name="cancellation_policy" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("policy")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>{CANCELLATION_POLICIES.map((p) => <SelectItem key={p} value={p}>{tp(p)}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="auto_confirm" render={({ field }) => (
              <FormItem className="flex items-center gap-3 space-y-0 sm:col-span-2">
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <div><FormLabel>{t("autoConfirm")}</FormLabel><FormDescription>{t("autoConfirmHint")}</FormDescription></div>
              </FormItem>
            )} />
            <div className="sm:col-span-2"><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="animate-spin" />} {t("save")}</Button></div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ hours */
function HoursForm({ hours }: { hours: BusinessHours[] }) {
  const t = useTranslations("DashSettings.hours");
  const td = useTranslations("DashSettings.days");
  const router = useRouter();
  const form = useForm<BusinessHoursInput>({
    resolver: zodResolver(businessHoursSchema),
    defaultValues: {
      days: Array.from({ length: 7 }, (_, d) => {
        const h = hours.find((x) => x.day_of_week === d);
        const weekday = d >= 1 && d <= 5;
        return {
          day_of_week: d,
          is_open: h ? h.is_open : weekday,
          open_time: t5(h?.open_time) || (weekday ? "09:00" : ""),
          close_time: t5(h?.close_time) || (weekday ? "17:00" : ""),
          break_start: t5(h?.break_start),
          break_end: t5(h?.break_end),
        };
      }),
    },
  });
  async function onSubmit(v: BusinessHoursInput) {
    const res = await toastAction(saveBusinessHoursAction(v));
    if (res.ok) router.refresh();
  }
  return (
    <Card>
      <CardHeader><CardTitle>{t("title")}</CardTitle><CardDescription>{t("desc")}</CardDescription></CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" noValidate>
            {DAYS_OF_WEEK.map((name, i) => {
              const open = form.watch(`days.${i}.is_open`);
              return (
                <div key={name} className="grid items-start gap-2 rounded-lg border p-3 md:grid-cols-[150px_1fr]">
                  <FormField control={form.control} name={`days.${i}.is_open`} render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-medium">{td(name)}</FormLabel></FormItem>
                  )} />
                  {open ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {(["open_time", "close_time", "break_start", "break_end"] as const).map((k) => (
                        <FormField key={k} control={form.control} name={`days.${i}.${k}`} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">{t(k)}</FormLabel>
                            <FormControl><Input type="time" {...field} value={field.value ?? ""} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      ))}
                    </div>
                  ) : (
                    <p className="pt-1.5 text-sm text-muted-foreground">{t("closed")}</p>
                  )}
                </div>
              );
            })}
            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="animate-spin" />} {t("save")}</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

/* --------------------------------------------------------------- holidays */
function HolidaysForm({ holidays }: { holidays: Holiday[] }) {
  const t = useTranslations("DashSettings.holidays");
  const f = useFormat();
  const router = useRouter();
  const form = useForm<HolidayInput>({ resolver: zodResolver(holidaySchema), defaultValues: { date: "", name: "", is_recurring: false } });
  async function onSubmit(v: HolidayInput) {
    const res = await toastAction(addHolidayAction(v));
    if (res.ok) { form.reset(); router.refresh(); }
  }
  return (
    <Card>
      <CardHeader><CardTitle>{t("title")}</CardTitle><CardDescription>{t("desc")}</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y">
          {holidays.map((h) => (
            <li key={h.id} className="flex items-center justify-between py-2 text-sm">
              <span><span className="font-medium">{h.name}</span> <span className="text-muted-foreground">{t(h.is_recurring ? "metaYearly" : "meta", { date: f.date(h.date) })}</span></span>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={t("remove")} className="text-muted-foreground hover:text-destructive" onClick={async () => { const r = await toastAction(deleteHolidayAction(h.id)); if (r.ok) router.refresh(); }}><Trash2 /></Button>
            </li>
          ))}
          {holidays.length === 0 && <li className="py-2 text-sm text-muted-foreground">{t("none")}</li>}
        </ul>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 sm:grid-cols-[170px_1fr_auto_auto] sm:items-start" noValidate>
            <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormControl><Input type="date" aria-label={t("date")} {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormControl><Input placeholder={t("namePh")} aria-label={t("name")} {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="is_recurring" render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0 pt-2"><FormControl><Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} /></FormControl><FormLabel className="font-normal">{t("yearly")}</FormLabel></FormItem>
            )} />
            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Plus />} {t("add")}</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export function ProviderSettingsForms({ rules, hours, holidays }: { rules: BookingRules | null; hours: BusinessHours[]; holidays: Holiday[] }) {
  return (
    <div className="space-y-6">
      <RulesForm rules={rules} />
      <HoursForm hours={hours} />
      <HolidaysForm holidays={holidays} />
    </div>
  );
}
