"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Clock, Loader2 } from "lucide-react";
import { bookingSchema, PRICE_UNIT_LABELS, type BookingInput, type PriceUnit } from "@ucommerz/shared";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Calendar } from "@/app/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/ui/form";
import { createBookingAction } from "@/app/actions/bookings";
import { toastAction } from "@/app/lib/toast-action";
import { computeTotal } from "@/app/lib/pricing";
import { formatCurrency } from "@/app/lib/utils";

type Props = {
  service: { id: string; title: string; price: number; price_unit: PriceUnit; min_duration: number | null; max_duration: number | null };
  state: "guest" | "owner" | "no-seeker" | "ready";
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function BookingForm({ service, state }: Props) {
  const router = useRouter();
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("10:00");
  const [open, setOpen] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  const form = useForm<BookingInput>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { service_id: service.id, booking_date: "", duration: service.min_duration ?? 1, notes: "" },
  });
  const duration = form.watch("duration");
  const total = computeTotal(service.price, service.price_unit, Number.isFinite(duration) ? duration : 0);

  if (state === "guest") {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">Sign in to book this service.</p>
        <Button asChild className="w-full"><Link href={`/login?next=${encodeURIComponent(`/services/${service.id}`)}`}>Sign in to book</Link></Button>
      </div>
    );
  }
  if (state === "owner") return <p className="text-sm text-muted-foreground">This is your own service. Manage it from your dashboard.</p>;
  if (state === "no-seeker") {
    return (
      <p className="text-sm text-muted-foreground">
        Your account is set up as a provider. Enable the customer role in your <Link href="/profile" className="font-medium text-primary hover:underline">profile</Link> to book services.
      </p>
    );
  }

  async function onSubmit(values: BookingInput) {
    if (!date) {
      setDateError("Choose a date");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      setDateError("Choose a time");
      return;
    }
    setDateError(null);
    const local = `${ymd(date)}T${time}`;
    const instant = new Date(local);
    if (Number.isNaN(instant.getTime()) || instant.getTime() <= Date.now()) {
      setDateError("Choose a time in the future");
      return;
    }
    const res = await toastAction(
      createBookingAction({ ...values, booking_date: instant.toISOString(), local_datetime: local }),
    );
    if (res.ok && res.data) {
      router.push(`/dashboard/bookings/${res.data.bookingId}`);
      router.refresh();
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid gap-2">
          <Label>Date</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className="w-full justify-start font-normal">
                <CalendarDays />
                {date ? date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : <span className="text-muted-foreground">Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  setDateError(null);
                  setOpen(false);
                }}
                disabled={{ before: today }}
                autoFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="booking-time">Start time</Label>
          <div className="relative">
            <Clock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="booking-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="pl-9" />
          </div>
          {dateError && <p className="text-sm text-destructive">{dateError}</p>}
        </div>
        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration (hours)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.5"
                  min={service.min_duration ?? 0.5}
                  max={service.max_duration ?? 240}
                  {...field}
                  value={Number.isFinite(field.value) ? field.value : ""}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes for the provider (optional)</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Share any details that will help…" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Estimated total</span>
          <span className="font-bold text-primary">{formatCurrency(total)}</span>
        </div>
        <p className="text-xs text-muted-foreground">{formatCurrency(service.price)} {PRICE_UNIT_LABELS[service.price_unit]}. You won&apos;t be charged online — the provider will confirm your request first.</p>
        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
          Request booking
        </Button>
      </form>
    </Form>
  );
}
