"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { profileSchema, type ProfileInput, type UserProfile } from "@ucommerz/shared";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/ui/form";
import { LocationField, type LatLng } from "@/app/components/LocationField";
import { updateProfileAction } from "@/app/actions/auth";
import { toastAction } from "@/app/lib/toast-action";

export function ProfileForm({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const [coords, setCoords] = useState<LatLng>({ latitude: profile.latitude, longitude: profile.longitude });
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
      bio: profile.bio ?? "",
      location: profile.location ?? "",
      website: profile.website ?? "",
      social_links: {
        facebook: profile.social_links?.facebook ?? "",
        instagram: profile.social_links?.instagram ?? "",
        twitter: profile.social_links?.twitter ?? "",
        linkedin: profile.social_links?.linkedin ?? "",
      },
    },
  });

  async function onSubmit(values: ProfileInput) {
    const res = await toastAction(updateProfileAction({ ...values, latitude: coords.latitude, longitude: coords.longitude }));
    if (res.ok) router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="full_name" render={({ field }) => (
            <FormItem><FormLabel>Full name</FormLabel><FormControl><Input autoComplete="name" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" autoComplete="tel" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="bio" render={({ field }) => (
          <FormItem><FormLabel>About you</FormLabel><FormControl><Textarea rows={4} {...field} value={field.value ?? ""} /></FormControl><FormDescription>Shown on your public profile.</FormDescription><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="location" render={({ field }) => (
          <FormItem>
            <FormLabel>Location</FormLabel>
            <LocationField value={field.value ?? ""} coords={coords} onChange={(addr, c) => { field.onChange(addr); setCoords(c); }} />
            <FormDescription>Used for nearby-service search and maps.</FormDescription>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="website" render={({ field }) => (
          <FormItem><FormLabel>Website</FormLabel><FormControl><Input type="url" placeholder="https://" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid gap-4 sm:grid-cols-2">
          {(["facebook", "instagram", "twitter", "linkedin"] as const).map((k) => (
            <FormField key={k} control={form.control} name={`social_links.${k}`} render={({ field }) => (
              <FormItem><FormLabel className="capitalize">{k}</FormLabel><FormControl><Input type="url" placeholder={`https://${k}.com/…`} {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
            )} />
          ))}
        </div>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="animate-spin" />} Save changes
        </Button>
      </form>
    </Form>
  );
}
