"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { categorySchema, emailSettingsSchema, generalSettingsSchema, resolveReportSchema, USER_ROLES, isStaffRole } from "@ucommerz/shared";
import { requireAdmin, requireSuperAdmin } from "@/app/lib/guards";
import { createAdminClient, hasServiceRole } from "@/app/lib/supabase/admin";
import { ActionError, limitAction, ok, parseInput, safeAction, type ActionResult } from "@/app/lib/action";
import { logAdminAction } from "@/app/lib/audit-logger";
import { sendEmail } from "@/app/lib/email-service";

const uuid = z.string().uuid();

async function createNotification(userId: string, title: string, message: string, link: string | null, type = "SYSTEM") {
  if (!hasServiceRole()) return;
  try {
    await createAdminClient().from("notifications").insert({ user_id: userId, type, title, message, link });
  } catch (e) {
    console.error("[admin] notification failed", e);
  }
}

const createUserSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  full_name: z.string().trim().min(2, "Enter the full name").max(100),
  role: z.enum(USER_ROLES),
});

/** SUPERADMIN creates a confirmed account with any role (needs the service role key). */
export async function createUserAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return safeAction<{ id: string }>(async () => {
    await limitAction("admin-create-user", 20, 10 * 60_000);
    const { profile } = await requireSuperAdmin();
    const v = parseInput(createUserSchema, input);
    if (!hasServiceRole()) throw new ActionError("Creating users requires SUPABASE_SERVICE_ROLE_KEY on the server.");
    const admin = createAdminClient();
    const metaRole = v.role === "PROVIDER" || v.role === "BOTH" ? v.role : "SEEKER";
    const { data, error } = await admin.auth.admin.createUser({
      email: v.email,
      password: v.password,
      email_confirm: true,
      user_metadata: { full_name: v.full_name, role: metaRole },
    });
    if (error || !data.user) throw new ActionError(error?.message ?? "Could not create the user.");
    const { error: e2 } = await admin.from("users").upsert({ id: data.user.id, email: v.email, full_name: v.full_name, role: v.role }, { onConflict: "id" });
    if (e2) throw new ActionError(e2.message);
    await logAdminAction({ adminId: profile.id, action: "USER_CREATED", targetType: "user", targetId: data.user.id, details: { email: v.email, role: v.role } });
    revalidatePath("/admin/users");
    return ok(`Account created for ${v.email}.`, { id: data.user.id });
  });
}

/** Moderators (ADMIN) can't touch other staff accounts; only a SUPERADMIN can. */
async function assertCanManage(supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"], actor: { id: string; role: string }, targetId: string) {
  if (actor.role === "SUPERADMIN" || targetId === actor.id) return;
  const { data } = await supabase.from("users").select("role").eq("id", targetId).maybeSingle();
  if (data && isStaffRole(data.role as string)) throw new ActionError("Only a super admin can manage other administrators.");
}

/* ------------------------------------------------------------------ users */
export async function setUserActiveAction(userId: string, active: boolean): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireAdmin();
    const id = parseInput(uuid, userId);
    if (id === profile.id) throw new ActionError("You can't suspend your own account.");
    await assertCanManage(supabase, profile, id);
    const { error } = await supabase.from("users").update({ is_active: active }).eq("id", id);
    if (error) throw new ActionError(error.message);
    await logAdminAction({ adminId: profile.id, action: active ? "USER_REACTIVATED" : "USER_SUSPENDED", targetType: "user", targetId: id });
    revalidatePath("/admin/users");
    return ok(active ? "User reactivated." : "User suspended.");
  });
}

export async function setUserVerifiedAction(userId: string, verified: boolean): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireAdmin();
    const id = parseInput(uuid, userId);
    await assertCanManage(supabase, profile, id);
    const { error } = await supabase.from("users").update({ verified }).eq("id", id);
    if (error) throw new ActionError(error.message);
    await logAdminAction({ adminId: profile.id, action: verified ? "USER_VERIFIED" : "USER_UNVERIFIED", targetType: "user", targetId: id });
    if (verified) await createNotification(id, "You're verified!", "An administrator verified your profile.", "/profile");
    revalidatePath("/admin/users");
    return ok(verified ? "User verified." : "Verification removed.");
  });
}

export async function setUserRoleAction(userId: string, role: string): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireSuperAdmin();
    const id = parseInput(uuid, userId);
    const next = parseInput(z.enum(USER_ROLES), role);
    if (id === profile.id && next !== "SUPERADMIN") throw new ActionError("You can't remove your own super admin role.");
    const { error } = await supabase.from("users").update({ role: next }).eq("id", id);
    if (error) throw new ActionError(error.message);
    await logAdminAction({ adminId: profile.id, action: "USER_ROLE_CHANGED", targetType: "user", targetId: id, details: { role: next } });
    revalidatePath("/admin/users");
    return ok(`Role changed to ${next}.`);
  });
}

export async function deleteUserAction(userId: string): Promise<ActionResult> {
  return safeAction(async () => {
    await limitAction("admin-delete-user", 10, 10 * 60_000);
    const { profile } = await requireSuperAdmin();
    const id = parseInput(uuid, userId);
    if (id === profile.id) throw new ActionError("You can't delete your own account.");
    if (!hasServiceRole()) throw new ActionError("Deleting users requires SUPABASE_SERVICE_ROLE_KEY on the server.");
    const admin = createAdminClient();
    const { data: target } = await admin.from("users").select("email, role").eq("id", id).maybeSingle();
    if (isStaffRole(target?.role as string | undefined)) throw new ActionError("Demote this administrator before deleting the account.");
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw new ActionError(error.message);
    await logAdminAction({ adminId: profile.id, action: "USER_DELETED", targetType: "user", targetId: id, details: { email: target?.email ?? null } });
    revalidatePath("/admin/users");
    return ok("User deleted.");
  });
}

/* --------------------------------------------------------------- services */
export async function moderateServiceAction(serviceId: string, status: "ACTIVE" | "REJECTED" | "INACTIVE" | "PENDING", note?: string): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireAdmin();
    const id = parseInput(uuid, serviceId);
    const next = parseInput(z.enum(["ACTIVE", "REJECTED", "INACTIVE", "PENDING"]), status);
    const { data, error } = await supabase.from("services").update({ status: next }).eq("id", id).select("id, title, provider_id").maybeSingle();
    if (error) throw new ActionError(error.message);
    if (!data) throw new ActionError("Service not found.");
    await logAdminAction({ adminId: profile.id, action: `SERVICE_${next}`, targetType: "service", targetId: id, details: { note: note ?? null } });
    if (next === "ACTIVE" || next === "REJECTED") {
      await createNotification(
        data.provider_id as string,
        next === "ACTIVE" ? "Service approved" : "Service rejected",
        next === "ACTIVE" ? `“${data.title}” is now live.` : `“${data.title}” was rejected${note ? `: ${note}` : "."}`,
        `/dashboard/my-services`,
        "SERVICE_UPDATE",
      );
    }
    revalidatePath("/admin/services");
    revalidatePath(`/services/${id}`);
    return ok(next === "ACTIVE" ? "Service approved." : next === "REJECTED" ? "Service rejected." : "Service updated.");
  });
}

export async function setServiceFeaturedAction(serviceId: string, featured: boolean): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireAdmin();
    const id = parseInput(uuid, serviceId);
    const { error } = await supabase.from("services").update({ featured }).eq("id", id);
    if (error) throw new ActionError(error.message);
    await logAdminAction({ adminId: profile.id, action: featured ? "SERVICE_FEATURED" : "SERVICE_UNFEATURED", targetType: "service", targetId: id });
    revalidatePath("/admin/services");
    revalidatePath("/");
    return ok(featured ? "Service featured." : "Service un-featured.");
  });
}

export async function adminDeleteServiceAction(serviceId: string): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireSuperAdmin();
    const id = parseInput(uuid, serviceId);
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) throw new ActionError(error.message);
    await logAdminAction({ adminId: profile.id, action: "SERVICE_DELETED", targetType: "service", targetId: id });
    revalidatePath("/admin/services");
    return ok("Service deleted.");
  });
}

export async function verifyCertificationAction(certId: string, verified: boolean): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireAdmin();
    const id = parseInput(uuid, certId);
    const { error } = await supabase.from("provider_certifications").update({ verified }).eq("id", id);
    if (error) throw new ActionError(error.message);
    await logAdminAction({ adminId: profile.id, action: verified ? "CERTIFICATION_VERIFIED" : "CERTIFICATION_UNVERIFIED", targetType: "certification", targetId: id });
    revalidatePath("/admin/users");
    return ok(verified ? "Certification verified." : "Verification removed.");
  });
}

/* ------------------------------------------------------------- categories */
const categoryWithId = categorySchema.and(z.object({ id: uuid.optional() }));

export async function saveCategoryAction(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireSuperAdmin();
    const v = parseInput(categoryWithId, input);
    if (v.id && v.parent_id === v.id) throw new ActionError("A category can't be its own parent.");
    if (v.parent_id) {
      const { data: parent } = await supabase.from("categories").select("id, parent_id").eq("id", v.parent_id).maybeSingle();
      if (!parent) throw new ActionError("Parent category not found.");
      if (parent.parent_id) throw new ActionError("Only two levels of categories are supported.");
    }
    const row = { name: v.name.trim(), slug: v.slug, icon: v.icon || null, description: v.description || null, parent_id: v.parent_id, order_position: v.order_position, is_active: v.is_active };
    const { error } = v.id ? await supabase.from("categories").update(row).eq("id", v.id) : await supabase.from("categories").insert(row);
    if (error) throw new ActionError(error.code === "23505" ? "That slug is already used." : error.message);
    await logAdminAction({ adminId: profile.id, action: v.id ? "CATEGORY_UPDATED" : "CATEGORY_CREATED", targetType: "category", targetId: v.id, details: { slug: v.slug } });
    revalidatePath("/admin/categories");
    revalidatePath("/categories");
    revalidatePath("/");
    return ok(v.id ? "Category updated." : "Category created.");
  });
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireSuperAdmin();
    const catId = parseInput(uuid, id);
    const { data: cat } = await supabase.from("categories").select("slug").eq("id", catId).maybeSingle();
    if (!cat) throw new ActionError("Category not found.");
    const { count } = await supabase.from("services").select("id", { count: "exact", head: true }).or(`category.eq.${cat.slug},sub_category.eq.${cat.slug}`);
    if ((count ?? 0) > 0) throw new ActionError(`${count} service(s) use this category. Reassign them or deactivate the category instead.`);
    const { error } = await supabase.from("categories").delete().eq("id", catId);
    if (error) throw new ActionError(error.message);
    await logAdminAction({ adminId: profile.id, action: "CATEGORY_DELETED", targetType: "category", targetId: catId });
    revalidatePath("/admin/categories");
    revalidatePath("/categories");
    return ok("Category deleted.");
  });
}

/* ---------------------------------------------------------------- reports */
export async function resolveReportAction(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireAdmin();
    const v = parseInput(resolveReportSchema, input);
    const { data, error } = await supabase
      .from("reports")
      .update({ status: v.status, resolution_notes: v.resolution_notes || null, resolved_by: v.status === "UNDER_REVIEW" ? null : profile.id })
      .eq("id", v.report_id)
      .select("id, reporter_id")
      .maybeSingle();
    if (error) throw new ActionError(error.message);
    if (!data) throw new ActionError("Report not found.");
    await logAdminAction({ adminId: profile.id, action: `REPORT_${v.status}`, targetType: "report", targetId: v.report_id, details: { notes: v.resolution_notes ?? null } });
    if (v.status !== "UNDER_REVIEW") {
      await createNotification(data.reporter_id as string, "Your report was reviewed", v.status === "RESOLVED" ? "Thanks — we took action on your report." : "We reviewed your report and found no violation.", null, "REPORT");
    }
    revalidatePath("/admin/reports");
    revalidatePath("/admin");
    return ok(v.status === "RESOLVED" ? "Report resolved." : v.status === "DISMISSED" ? "Report dismissed." : "Marked under review.");
  });
}

/* --------------------------------------------------------------- settings */
async function upsertSetting(key: string, value: unknown, group: string, adminId: string, supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"]) {
  const { error } = await supabase.from("platform_settings").upsert({ setting_key: key, setting_value: value, setting_group: group, updated_by: adminId }, { onConflict: "setting_key" });
  if (error) throw new ActionError(error.message);
}

export async function saveGeneralSettingsAction(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireSuperAdmin();
    const v = parseInput(generalSettingsSchema, input);
    await Promise.all([
      upsertSetting("site_name", v.site_name, "general", profile.id, supabase),
      upsertSetting("support_email", v.support_email, "general", profile.id, supabase),
      upsertSetting("commission_rate", v.commission_rate, "general", profile.id, supabase),
      upsertSetting("allow_registration", v.allow_registration, "general", profile.id, supabase),
      upsertSetting("maintenance_mode", v.maintenance_mode, "general", profile.id, supabase),
      upsertSetting("require_service_approval", v.require_service_approval, "general", profile.id, supabase),
    ]);
    await logAdminAction({ adminId: profile.id, action: "SETTINGS_UPDATED", targetType: "settings", details: { group: "general" } });
    revalidatePath("/admin/settings");
    return ok("Settings saved.");
  });
}

export async function saveEmailSettingsAction(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireSuperAdmin();
    const v = parseInput(emailSettingsSchema, input);
    await upsertSetting("email_settings", v, "email", profile.id, supabase);
    await logAdminAction({ adminId: profile.id, action: "SETTINGS_UPDATED", targetType: "settings", details: { group: "email" } });
    revalidatePath("/admin/email-settings");
    return ok("Email settings saved.");
  });
}

export async function sendTestEmailAction(): Promise<ActionResult> {
  return safeAction(async () => {
    await limitAction("admin-test-email", 5, 60_000);
    const { profile, supabase } = await requireSuperAdmin();
    const { getEmailSettings } = await import("@/app/lib/email-service");
    const settings = await getEmailSettings(supabase);
    const result = await sendEmail({
      to: profile.email,
      subject: "UCOMMERZ test email",
      html: `<p>Hi ${profile.full_name ?? "there"},</p><p>This is a test email from your UCOMMERZ installation. Email delivery is working.</p>`,
      settings,
    });
    if (!result.ok) throw new ActionError(result.error);
    await logAdminAction({ adminId: profile.id, action: "TEST_EMAIL_SENT", targetType: "settings" });
    return ok(`Test email sent to ${profile.email}.`);
  });
}
