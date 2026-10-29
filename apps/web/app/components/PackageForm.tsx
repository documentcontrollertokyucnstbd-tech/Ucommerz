"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { packageSchema, type PackageInput, type Service } from "@ucommerz/shared";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Switch } from "@/app/components/ui/switch";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/ui/form";
import { createPackageAction } from "@/app/actions/provider";
import { toastAction } from "@/app/lib/toast-action";
import { computePackagePrice } from "@/app/lib/pricing";
import { useFormat } from "@/app/lib/use-format";

export function PackageForm({ services }: { services: Pick<Service, "id" | "title" | "price" | "price_unit">[] }) {
  const t = useTranslations("DashPackages.form");
  const f = useFormat();
  const router = useRouter();
  const form = useForm<PackageInput>({
    resolver: zodResolver(packageSchema),
    defaultValues: { title: "", description: "", discount_percentage: 10, is_active: true, service_ids: [] },
  });
  const ids = form.watch("service_ids");
  const discount = form.watch("discount_percentage");
  const { subtotal, total } = computePackagePrice(
    services.filter((s) => ids.includes(s.id)).map((s) => ({ price: s.price })),
    Number.isFinite(discount) ? discount : 0,
  );

  async function onSubmit(v: PackageInput) {
    const res = await toastAction(createPackageAction(v));
    if (res.ok) {
      router.push("/dashboard/my-packages");
      router.refresh();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>{t("title")}</FormLabel><FormControl><Input placeholder={t("titlePh")} {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>{t("description")}</FormLabel><FormControl><Textarea rows={3} {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="service_ids" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("included")}</FormLabel>
            <div className="grid gap-2 sm:grid-cols-2">
              {services.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm">
                  <Checkbox checked={field.value.includes(s.id)} onCheckedChange={(c) => field.onChange(c === true ? [...field.value, s.id] : field.value.filter((x) => x !== s.id))} />
                  <span className="min-w-0 flex-1 truncate">{s.title}</span>
                  <span className="text-muted-foreground">{f.currency(s.price)}</span>
                </label>
              ))}
              {services.length === 0 && <p className="text-sm text-muted-foreground">{t("noServices")}</p>}
            </div>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="discount_percentage" render={({ field }) => (
          <FormItem className="max-w-xs"><FormLabel>{t("discount")}</FormLabel><FormControl><Input type="number" min={0} max={90} {...field} value={Number.isFinite(field.value) ? field.value : ""} onChange={(e) => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">{t("subtotal")}</span><span>{f.currency(subtotal)}</span></div>
          <div className="flex justify-between font-semibold"><span>{t("price")}</span><span className="text-primary">{f.currency(total)}</span></div>
        </div>
        <FormField control={form.control} name="is_active" render={({ field }) => (
          <FormItem className="flex items-center gap-3 space-y-0"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>{t("publish")}</FormLabel></FormItem>
        )} />
        <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="animate-spin" />} {t("create")}</Button>
      </form>
    </Form>
  );
}
