"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { ImagePlus, Loader2, X } from "lucide-react";
import { PRICE_UNITS, STORAGE_BUCKETS, serviceSchema, type Category, type Service, type ServiceInput } from "@ucommerz/shared";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { CategorySelect } from "@/app/components/CategorySelect";
import { LocationField, type LatLng } from "@/app/components/LocationField";
import { createServiceAction, updateServiceAction } from "@/app/actions/services";
import { uploadFile, validateFile } from "@/app/lib/upload";
import { toastAction } from "@/app/lib/toast-action";

const optNum = (e: React.ChangeEvent<HTMLInputElement>) => (e.target.value === "" ? undefined : e.target.valueAsNumber);

export function ServiceForm({ categories, userId, service, providerId }: { categories: Category[]; userId: string; service?: Service; providerId?: string }) {
  const t = useTranslations("DashForm");
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>(service?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [coords, setCoords] = useState<LatLng>({ latitude: service?.latitude ?? null, longitude: service?.longitude ?? null });

  const form = useForm<ServiceInput>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      title: service?.title ?? "",
      description: service?.description ?? "",
      category: service?.category ?? "",
      sub_category: service?.sub_category ?? "",
      price: service ? Number(service.price) : 0,
      price_unit: service?.price_unit ?? "hour",
      min_duration: service?.min_duration ? Number(service.min_duration) : undefined,
      max_duration: service?.max_duration ? Number(service.max_duration) : undefined,
      location: service?.location ?? "",
      is_remote: service?.is_remote ?? false,
      is_on_site: service?.is_on_site ?? true,
      service_address: service?.service_address ?? "",
      service_radius: service?.service_radius ? Number(service.service_radius) : undefined,
    },
  });

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, 8 - images.length);
    for (const f of list) {
      const p = validateFile(f);
      if (p) return void toast.error(`${f.name}: ${p}`);
    }
    setUploading(true);
    try {
      const urls = await Promise.all(list.map((f) => uploadFile(f, { bucket: STORAGE_BUCKETS.services, userId })));
      setImages((prev) => [...prev, ...urls].slice(0, 8));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("uploadFailed"));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function onSubmit(values: ServiceInput) {
    const payload = { ...values, images, latitude: coords.latitude, longitude: coords.longitude };
    if (service) {
      const res = await toastAction(updateServiceAction(service.id, payload));
      if (res.ok) {
        router.push("/dashboard/my-services");
        router.refresh();
      }
    } else {
      const res = await toastAction(createServiceAction(payload, providerId));
      if (res.ok) {
        router.push(providerId ? "/admin/services" : "/dashboard/my-services");
        router.refresh();
      }
    }
  }

  const cat = form.watch("category");
  const sub = form.watch("sub_category") ?? "";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" noValidate>
        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold">{t("basics")}</h2>
          <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem><FormLabel>{t("title")}</FormLabel><FormControl><Input placeholder={t("titlePh")} {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem><FormLabel>{t("description")}</FormLabel><FormControl><Textarea rows={6} placeholder={t("descriptionPh")} {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <div>
            <CategorySelect
              categories={categories}
              category={cat}
              subCategory={sub}
              onChange={(c, s) => {
                form.setValue("category", c, { shouldValidate: true });
                form.setValue("sub_category", s);
              }}
              error={form.formState.errors.category?.message}
            />
            {form.formState.errors.category && <p className="mt-1 text-sm text-destructive">{form.formState.errors.category.message}</p>}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold">{t("pricing")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="price" render={({ field }) => (
              <FormItem><FormLabel>{t("priceUsd")}</FormLabel><FormControl><Input type="number" min={0} step="0.01" {...field} value={Number.isFinite(field.value) ? field.value : ""} onChange={(e) => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="price_unit" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("billed")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>{PRICE_UNITS.map((u) => <SelectItem key={u} value={u}>{t(`units.${u}`)}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="min_duration" render={({ field }) => (
              <FormItem><FormLabel>{t("minDuration")}</FormLabel><FormControl><Input type="number" step="0.5" min={0.5} {...field} value={field.value ?? ""} onChange={(e) => field.onChange(optNum(e))} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="max_duration" render={({ field }) => (
              <FormItem><FormLabel>{t("maxDuration")}</FormLabel><FormControl><Input type="number" step="0.5" min={0.5} {...field} value={field.value ?? ""} onChange={(e) => field.onChange(optNum(e))} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold">{t("locationDelivery")}</h2>
          <div className="flex flex-wrap gap-6">
            <FormField control={form.control} name="is_on_site" render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} /></FormControl><FormLabel className="font-normal">{t("onSite")}</FormLabel></FormItem>
            )} />
            <FormField control={form.control} name="is_remote" render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} /></FormControl><FormLabel className="font-normal">{t("remote")}</FormLabel></FormItem>
            )} />
          </div>
          {form.formState.errors.is_on_site && <p className="text-sm text-destructive">{form.formState.errors.is_on_site.message}</p>}
          <FormField control={form.control} name="location" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("serviceLocation")}</FormLabel>
              <LocationField value={field.value ?? ""} coords={coords} onChange={(a, c) => { field.onChange(a); setCoords(c); }} />
              <FormDescription>{t("nearMeHint")}</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="service_address" render={({ field }) => (
              <FormItem><FormLabel>{t("street")}</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="service_radius" render={({ field }) => (
              <FormItem><FormLabel>{t("radius")}</FormLabel><FormControl><Input type="number" min={0} step="1" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(optNum(e))} /></FormControl><FormDescription>{t("radiusHint")}</FormDescription><FormMessage /></FormItem>
            )} />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">{t("photos")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {images.map((src, i) => (
              <div key={src} className="group relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted">
                <img src={src} alt={t("photoAlt", { n: i + 1 })} className="size-full object-cover" />
                <button type="button" aria-label={t("removePhoto")} onClick={() => setImages((p) => p.filter((x) => x !== src))} className="absolute end-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white opacity-90 transition hover:bg-black">
                  <X className="size-3.5" />
                </button>
                {i === 0 && <span className="absolute bottom-1.5 start-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">{t("cover")}</span>}
              </div>
            ))}
            {images.length < 8 && (
              <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-sm text-muted-foreground transition hover:border-primary hover:text-primary">
                {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
                {uploading ? t("uploading") : t("addPhotos")}
              </button>
            )}
          </div>
          <input ref={fileInput} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => onFiles(e.target.files)} aria-label={t("uploadLabel")} />
          <p className="text-xs text-muted-foreground">{t("photoHint")}</p>
        </section>

        <div className="flex gap-3">
          <Button type="submit" size="lg" disabled={form.formState.isSubmitting || uploading}>
            {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
            {service ? t("save") : t("submit")}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>{t("cancel")}</Button>
        </div>
      </form>
    </Form>
  );
}
