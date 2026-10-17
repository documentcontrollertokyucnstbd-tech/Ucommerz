"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { ImagePlus, Loader2, X } from "lucide-react";
import { PRICE_UNITS, PRICE_UNIT_LABELS, STORAGE_BUCKETS, serviceSchema, type Category, type Service, type ServiceInput } from "@ucommerz/shared";
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
      toast.error(e instanceof Error ? e.message : "Upload failed");
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
          <h2 className="font-display text-lg font-semibold">Basics</h2>
          <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g. Professional home cleaning" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={6} placeholder="What's included, your experience, how it works…" {...field} /></FormControl><FormMessage /></FormItem>
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
          <h2 className="font-display text-lg font-semibold">Pricing & duration</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="price" render={({ field }) => (
              <FormItem><FormLabel>Price (USD)</FormLabel><FormControl><Input type="number" min={0} step="0.01" {...field} value={Number.isFinite(field.value) ? field.value : ""} onChange={(e) => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="price_unit" render={({ field }) => (
              <FormItem>
                <FormLabel>Billed</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>{PRICE_UNITS.map((u) => <SelectItem key={u} value={u}>{PRICE_UNIT_LABELS[u]}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="min_duration" render={({ field }) => (
              <FormItem><FormLabel>Min duration (hours)</FormLabel><FormControl><Input type="number" step="0.5" min={0.5} {...field} value={field.value ?? ""} onChange={(e) => field.onChange(optNum(e))} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="max_duration" render={({ field }) => (
              <FormItem><FormLabel>Max duration (hours)</FormLabel><FormControl><Input type="number" step="0.5" min={0.5} {...field} value={field.value ?? ""} onChange={(e) => field.onChange(optNum(e))} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold">Location & delivery</h2>
          <div className="flex flex-wrap gap-6">
            <FormField control={form.control} name="is_on_site" render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} /></FormControl><FormLabel className="font-normal">On-site</FormLabel></FormItem>
            )} />
            <FormField control={form.control} name="is_remote" render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} /></FormControl><FormLabel className="font-normal">Remote</FormLabel></FormItem>
            )} />
          </div>
          {form.formState.errors.is_on_site && <p className="text-sm text-destructive">{form.formState.errors.is_on_site.message}</p>}
          <FormField control={form.control} name="location" render={({ field }) => (
            <FormItem>
              <FormLabel>Service location</FormLabel>
              <LocationField value={field.value ?? ""} coords={coords} onChange={(a, c) => { field.onChange(a); setCoords(c); }} />
              <FormDescription>Customers can find you with &ldquo;Near me&rdquo; search.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="service_address" render={({ field }) => (
              <FormItem><FormLabel>Street address (optional)</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="service_radius" render={({ field }) => (
              <FormItem><FormLabel>Service radius (km)</FormLabel><FormControl><Input type="number" min={0} step="1" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(optNum(e))} /></FormControl><FormDescription>How far you travel.</FormDescription><FormMessage /></FormItem>
            )} />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Photos</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {images.map((src, i) => (
              <div key={src} className="group relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted">
                <img src={src} alt={`Service photo ${i + 1}`} className="size-full object-cover" />
                <button type="button" aria-label="Remove photo" onClick={() => setImages((p) => p.filter((x) => x !== src))} className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white opacity-90 transition hover:bg-black">
                  <X className="size-3.5" />
                </button>
                {i === 0 && <span className="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">Cover</span>}
              </div>
            ))}
            {images.length < 8 && (
              <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-sm text-muted-foreground transition hover:border-primary hover:text-primary">
                {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
                {uploading ? "Uploading…" : "Add photos"}
              </button>
            )}
          </div>
          <input ref={fileInput} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => onFiles(e.target.files)} aria-label="Upload service photos" />
          <p className="text-xs text-muted-foreground">Up to 8 images, 5 MB each. The first image is the cover.</p>
        </section>

        <div className="flex gap-3">
          <Button type="submit" size="lg" disabled={form.formState.isSubmitting || uploading}>
            {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
            {service ? "Save changes" : "Submit service"}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </Form>
  );
}
