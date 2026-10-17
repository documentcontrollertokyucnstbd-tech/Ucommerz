"use server";

import { isStaffRole } from "@ucommerz/shared";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { serviceSchema } from "@ucommerz/shared";
import { requireAdmin, requireProvider } from "@/app/lib/guards";
import { logAdminAction } from "@/app/lib/audit-logger";
import { createAdminClient, hasServiceRole } from "@/app/lib/supabase/admin";
import { ActionError, limitAction, ok, parseInput, safeAction, type ActionResult } from "@/app/lib/action";
import { logActivity } from "@/app/lib/activity-service";
import { bustPublicCache } from "@/app/lib/public-cache";
import { geocodeAddressServer } from "@/app/lib/geocoding";

const serviceFormSchema = serviceSchema.and(
  z.object({
    images: z.array(z.string().url()).max(8, "Up to 8 images"),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
  }),
);

function toRow(v: z.output<typeof serviceFormSchema>) {
  return {
    title: v.title.trim(),
    description: v.description.trim(),
    category: v.category,
    sub_category: v.sub_category || null,
    price: v.price,
    price_unit: v.price_unit,
    min_duration: v.min_duration ?? null,
    max_duration: v.max_duration ?? null,
    images: v.images,
    location: v.location || null,
    is_remote: v.is_remote,
    is_on_site: v.is_on_site,
    service_address: v.service_address || null,
    service_radius: v.service_radius ?? null,
  };
}

async function resolveCoords(v: z.output<typeof serviceFormSchema>) {
  if (v.latitude != null && v.longitude != null) return { latitude: v.latitude, longitude: v.longitude };
  const address = v.service_address || v.location;
  if (!address) return { latitude: null, longitude: null };
  try {
    const r = await geocodeAddressServer(address);
    return r ? { latitude: r.latitude, longitude: r.longitude } : { latitude: null, longitude: null };
  } catch {
    return { latitude: null, longitude: null };
  }
}

async function approvalRequired(): Promise<boolean> {
  try {
    if (!hasServiceRole()) return true;
    const admin = createAdminClient();
    const { data } = await admin.from("platform_settings").select("setting_value").eq("setting_key", "require_service_approval").maybeSingle();
    const raw = data?.setting_value;
    return !(raw === false || raw === "false");
  } catch {
    return true;
  }
}

/** Providers create their own services. Staff pass `onBehalfOf` (a provider's user id) to create one for that provider. */
export async function createServiceAction(input: unknown, onBehalfOf?: string): Promise<ActionResult<{ id: string; status: string }>> {
  return safeAction<{ id: string; status: string }>(async () => {
    await limitAction("create-service", 15, 10 * 60_000);
    const { profile, supabase } = onBehalfOf ? await requireAdmin() : await requireProvider("/dashboard/my-services/create");
    const v = parseInput(serviceFormSchema, input);
    const coords = await resolveCoords(v);

    let ownerId = profile.id;
    if (onBehalfOf) {
      ownerId = parseInput(z.string().uuid(), onBehalfOf);
      const { data: owner } = await supabase.from("users").select("role, is_active").eq("id", ownerId).maybeSingle();
      if (!owner || !["PROVIDER", "BOTH"].includes(owner.role as string)) throw new ActionError("Choose a provider account.");
      if (!owner.is_active) throw new ActionError("That provider account is suspended.");
    }

    const { data, error } = await supabase
      .from("services")
      .insert({
        ...toRow(v),
        provider_id: ownerId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        service_latitude: coords.latitude,
        service_longitude: coords.longitude,
      })
      .select("id, status")
      .single();
    if (error || !data) throw new ActionError(error?.message ?? "Could not create the service.");

    let status: string = data.status;
    if (onBehalfOf) {
      // staff-created services are published right away (RLS + trigger let staff set the status)
      const { error: e3 } = await supabase.from("services").update({ status: "ACTIVE" }).eq("id", data.id);
      if (!e3) status = "ACTIVE";
      await logAdminAction({ adminId: profile.id, action: "SERVICE_CREATED_FOR_PROVIDER", targetType: "service", targetId: data.id, details: { provider_id: ownerId } });
      revalidatePath("/admin/services");
      revalidatePath("/browse");
    bustPublicCache();
      return ok(status === "ACTIVE" ? "Service published for the provider." : "Service created.", { id: data.id, status });
    }
    if (!(await approvalRequired()) && hasServiceRole()) {
      const { error: e2 } = await createAdminClient().from("services").update({ status: "ACTIVE" }).eq("id", data.id);
      if (!e2) status = "ACTIVE";
    }

    await logActivity({ userId: profile.id, action: "SERVICE_CREATED", targetType: "service", targetId: data.id, description: `Created service “${v.title}”` }, supabase);
    revalidatePath("/dashboard/my-services");
    revalidatePath("/browse");
    bustPublicCache();
    return ok(status === "ACTIVE" ? "Service published!" : "Service submitted for review.", { id: data.id, status });
  });
}

export async function updateServiceAction(id: string, input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    await limitAction("update-service", 30);
    const { profile, supabase } = await requireProvider();
    const serviceId = parseInput(z.string().uuid(), id);
    const v = parseInput(serviceFormSchema, input);
    const coords = await resolveCoords(v);

    const { data: existing } = await supabase.from("services").select("id, status, provider_id").eq("id", serviceId).maybeSingle();
    if (!existing || (existing.provider_id !== profile.id && !isStaffRole(profile.role))) throw new ActionError("Service not found.");

    const update: Record<string, unknown> = {
      ...toRow(v),
      latitude: coords.latitude,
      longitude: coords.longitude,
      service_latitude: coords.latitude,
      service_longitude: coords.longitude,
    };
    // Editing a rejected service re-submits it for review.
    if (existing.status === "REJECTED") update.status = "PENDING";

    const { error } = await supabase.from("services").update(update).eq("id", serviceId);
    if (error) throw new ActionError(error.message);

    await logActivity({ userId: profile.id, action: "SERVICE_UPDATED", targetType: "service", targetId: serviceId, description: `Updated service “${v.title}”` }, supabase);
    revalidatePath("/dashboard/my-services");
    revalidatePath(`/services/${serviceId}`);
    return ok("Service updated.");
  });
}

export async function setServiceStatusAction(id: string, status: "ACTIVE" | "INACTIVE"): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireProvider();
    const serviceId = parseInput(z.string().uuid(), id);
    const next = parseInput(z.enum(["ACTIVE", "INACTIVE"]), status);
    const { data: existing } = await supabase.from("services").select("id, status, provider_id").eq("id", serviceId).maybeSingle();
    if (!existing || existing.provider_id !== profile.id) throw new ActionError("Service not found.");
    if (existing.status === "PENDING" || existing.status === "REJECTED") throw new ActionError("This service is awaiting admin review.");
    const { error } = await supabase.from("services").update({ status: next }).eq("id", serviceId);
    if (error) throw new ActionError(error.message);
    await logActivity({ userId: profile.id, action: "SERVICE_UPDATED", targetType: "service", targetId: serviceId, description: next === "ACTIVE" ? "Activated a service" : "Paused a service" }, supabase);
    revalidatePath("/dashboard/my-services");
    revalidatePath(`/services/${serviceId}`);
    return ok(next === "ACTIVE" ? "Service is live." : "Service paused.");
  });
}

export async function deleteServiceAction(id: string): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireProvider();
    const serviceId = parseInput(z.string().uuid(), id);
    const { count } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("service_id", serviceId)
      .in("status", ["PENDING", "CONFIRMED", "IN_PROGRESS"]);
    if ((count ?? 0) > 0) throw new ActionError("This service has active bookings. Complete or cancel them first, or pause the service instead.");
    const { data, error } = await supabase.from("services").delete().eq("id", serviceId).eq("provider_id", profile.id).select("id");
    if (error) throw new ActionError(error.message);
    if (!data?.length) throw new ActionError("Service not found.");
    await logActivity({ userId: profile.id, action: "SERVICE_DELETED", targetType: "service", targetId: serviceId, description: "Deleted a service" }, supabase);
    revalidatePath("/dashboard/my-services");
    revalidatePath("/browse");
    bustPublicCache();
    return ok("Service deleted.");
  });
}
