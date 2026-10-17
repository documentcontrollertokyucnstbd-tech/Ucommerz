"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Play } from "lucide-react";
import { reminderSettingsSchema, type ReminderSettingsInput } from "@ucommerz/shared";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/ui/form";
import { runRemindersNowAction, saveReminderSettingsAction } from "@/app/actions/provider";
import { toastAction } from "@/app/lib/toast-action";

export function ReminderSettingsForm({ defaults }: { defaults: ReminderSettingsInput }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const form = useForm<ReminderSettingsInput>({ resolver: zodResolver(reminderSettingsSchema), defaultValues: defaults });
  const sms = form.watch("send_sms");

  async function onSubmit(v: ReminderSettingsInput) {
    const res = await toastAction(saveReminderSettingsAction(v));
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Automatic reminders</CardTitle><CardDescription>Customers get a reminder before each confirmed booking.</CardDescription></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <FormField control={form.control} name="enabled" render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Send reminders</FormLabel></FormItem>
              )} />
              <FormField control={form.control} name="reminder_hours" render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>Send how many hours before?</FormLabel>
                  <FormControl><Input type="number" min={1} max={168} {...field} value={Number.isFinite(field.value) ? field.value : ""} onChange={(e) => field.onChange(e.target.valueAsNumber)} /></FormControl>
                  <FormDescription>1–168 hours.</FormDescription><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="send_email" render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Email reminders</FormLabel></FormItem>
              )} />
              <FormField control={form.control} name="send_sms" render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><div><FormLabel>SMS reminders</FormLabel><FormDescription>Preference saved; SMS delivery needs an SMS provider to be connected.</FormDescription></div></FormItem>
              )} />
              {sms && (
                <FormField control={form.control} name="sms_phone" render={({ field }) => (
                  <FormItem className="max-w-xs"><FormLabel>SMS phone number</FormLabel><FormControl><Input type="tel" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )} />
              )}
              <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="animate-spin" />} Save settings</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Send due reminders now</CardTitle><CardDescription>Reminders are normally sent by the daily scheduled job. Run it manually to send anything that is due right away.</CardDescription></CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            disabled={running}
            onClick={async () => {
              setRunning(true);
              const res = await toastAction(runRemindersNowAction());
              setRunning(false);
              if (res.ok) router.refresh();
            }}
          >
            {running ? <Loader2 className="animate-spin" /> : <Play />} Run now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
