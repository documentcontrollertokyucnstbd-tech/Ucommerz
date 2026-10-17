"use server";

import { isStaffRole } from "@ucommerz/shared";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
  type UserRole,
} from "@ucommerz/shared";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/app/lib/supabase/admin";
import { requireUser } from "@/app/lib/guards";
import { ActionError, limitAction, ok, parseInput, safeAction, type ActionResult } from "@/app/lib/action";
import { logActivity } from "@/app/lib/activity-service";
import { safeNext } from "@/app/lib/safe-next";
import { getGeneralSettings } from "@/app/lib/settings";
import { absoluteUrl } from "@/app/lib/utils";

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "Incorrect email or password.";
  if (m.includes("email not confirmed")) return "Please verify your email first — check your inbox for the confirmation link.";
  if (m.includes("already registered") || m.includes("already been registered")) return "An account with this email already exists.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Please wait a moment and try again.";
  if (m.includes("password")) return message;
  return message || "Something went wrong. Please try again.";
}

/* ------------------------------------------------------------------ login */
export async function loginAction(input: unknown, next?: string): Promise<ActionResult<{ redirectTo: string }>> {
  return safeAction<{ redirectTo: string }>(async () => {
    await limitAction("login", 10);
    const v = parseInput(loginSchema, input);
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email: v.email, password: v.password });
    if (error || !data.user) throw new ActionError(friendlyAuthError(error?.message ?? "Unable to sign in"));

    const { data: profile } = await supabase.from("users").select("is_active, role").eq("id", data.user.id).maybeSingle();
    if (profile && profile.is_active === false) {
      await supabase.auth.signOut();
      throw new ActionError("This account has been suspended. Contact support for help.");
    }
    await logActivity({ userId: data.user.id, action: "LOGIN", description: "Signed in" });
    return ok("Welcome back!", { redirectTo: safeNext(next) });
  });
}

/* --------------------------------------------------------------- register */
export async function registerAction(
  input: unknown,
): Promise<ActionResult<{ needsVerification: boolean; redirectTo: string }>> {
  return safeAction<{ needsVerification: boolean; redirectTo: string }>(async () => {
    await limitAction("register", 6, 10 * 60_000);
    const v = parseInput(registerSchema, input);
    const supabase = await createClient();
    const general = await getGeneralSettings(supabase as never);
    if (!general.allow_registration) throw new ActionError("New registrations are currently closed.");

    const { data, error } = await supabase.auth.signUp({
      email: v.email,
      password: v.password,
      options: {
        emailRedirectTo: absoluteUrl("/auth/callback"),
        data: { full_name: v.full_name, role: v.role, phone: v.phone || null },
      },
    });
    if (error) throw new ActionError(friendlyAuthError(error.message));
    if (!data.user) throw new ActionError("Could not create your account. Please try again.");
    // Supabase returns an obfuscated user with no identities when the email is already registered.
    if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new ActionError("An account with this email already exists. Try signing in instead.");
    }

    // The DB trigger creates the profile row; this upsert makes sure the chosen role/phone are stored.
    if (hasServiceRole()) {
      try {
        const admin = createAdminClient();
        await admin
          .from("users")
          .upsert(
            { id: data.user.id, email: v.email, full_name: v.full_name, phone: v.phone || null, role: v.role },
            { onConflict: "id" },
          );
      } catch (e) {
        console.error("[register] profile upsert failed", e);
      }
    }

    const needsVerification = !data.session;
    const redirectTo = v.role === "SEEKER" ? "/dashboard" : "/dashboard/provider-profile/setup";
    return ok(
      needsVerification ? "Account created! Check your email to verify your address." : "Account created — welcome to UCOMMERZ!",
      { needsVerification, redirectTo },
    );
  });
}

/* -------------------------------------------------------- forgot / reset */
export async function forgotPasswordAction(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    await limitAction("forgot-password", 5, 10 * 60_000);
    const v = parseInput(forgotPasswordSchema, input);
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(v.email, {
      redirectTo: absoluteUrl("/auth/callback?next=/reset-password"),
    });
    if (error && /rate limit/i.test(error.message)) throw new ActionError(friendlyAuthError(error.message));
    // Same answer whether or not the account exists (prevents account enumeration).
    return ok("If an account exists for that email, a reset link is on its way.");
  });
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  return safeAction<{ redirectTo: string }>(async () => {
    await limitAction("reset-password", 8, 10 * 60_000);
    const v = parseInput(resetPasswordSchema, input);
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new ActionError("Your reset link has expired. Request a new one.");
    const { error } = await supabase.auth.updateUser({ password: v.password });
    if (error) throw new ActionError(friendlyAuthError(error.message));
    return ok("Password updated.", { redirectTo: "/dashboard" });
  });
}

export async function resendVerificationAction(email: string): Promise<ActionResult> {
  return safeAction(async () => {
    await limitAction("resend-verification", 4, 10 * 60_000);
    const v = parseInput(z.string().email(), email);
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: v,
      options: { emailRedirectTo: absoluteUrl("/auth/callback") },
    });
    if (error) throw new ActionError(friendlyAuthError(error.message));
    return ok("Verification email sent.");
  });
}

/* --------------------------------------------------------------- sign out */
export async function signOutAction(): Promise<ActionResult> {
  return safeAction<undefined>(async () => {
    const supabase = await createClient();
    await supabase.auth.signOut(); // clears the Supabase auth cookies
    revalidatePath("/", "layout");
    redirect("/");
  });
}

/* ---------------------------------------------------------------- profile */
const profileUpdateSchema = profileSchema.extend({
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireUser("/profile");
    const v = parseInput(profileUpdateSchema, input);

    const social = Object.fromEntries(
      Object.entries(v.social_links ?? {}).filter(([, val]) => typeof val === "string" && val.trim() !== ""),
    );

    const update: Record<string, unknown> = {
      full_name: v.full_name,
      phone: v.phone || null,
      bio: v.bio || null,
      location: v.location || null,
      website: v.website || null,
      social_links: social,
    };
    if (v.latitude !== undefined) update.latitude = v.latitude;
    if (v.longitude !== undefined) update.longitude = v.longitude;

    const { error } = await supabase.from("users").update(update).eq("id", profile.id);
    if (error) throw new ActionError(error.message);

    await logActivity({ userId: profile.id, action: "PROFILE_UPDATED", description: "Updated profile" }, supabase);
    revalidatePath("/profile");
    revalidatePath("/dashboard", "layout");
    if (profile.slug) revalidatePath(`/provider/${profile.slug}`);
    return ok("Profile saved.");
  });
}

export async function updateAvatarAction(avatarUrl: string | null): Promise<ActionResult> {
  return safeAction(async () => {
    const { profile, supabase } = await requireUser("/profile");
    const url = parseInput(z.string().url().max(1000).nullable(), avatarUrl);
    const { error } = await supabase.from("users").update({ avatar_url: url }).eq("id", profile.id);
    if (error) throw new ActionError(error.message);
    revalidatePath("/", "layout");
    return ok(url ? "Profile photo updated." : "Profile photo removed.");
  });
}

/** Lets a SEEKER (or PROVIDER) enable the other side. Roles are protected by a DB trigger, so this uses the service role. */
export async function enableRoleAction(target: "PROVIDER" | "SEEKER"): Promise<ActionResult<{ redirectTo: string }>> {
  return safeAction<{ redirectTo: string }>(async () => {
    const { profile } = await requireUser("/profile");
    parseInput(z.enum(["PROVIDER", "SEEKER"]), target);
    if (isStaffRole(profile.role)) throw new ActionError("Staff accounts manage the platform and have no provider or customer profile.");
    if (profile.role === "BOTH") throw new ActionError("Both account types are already enabled.");
    if (profile.role === target) throw new ActionError("That account type is already enabled.");
    if (!hasServiceRole()) {
      throw new ActionError("Changing account type requires SUPABASE_SERVICE_ROLE_KEY to be configured on the server.");
    }
    const admin = createAdminClient();
    const next: UserRole = "BOTH";
    const { error } = await admin.from("users").update({ role: next }).eq("id", profile.id);
    if (error) throw new ActionError(error.message);
    revalidatePath("/", "layout");
    return ok(target === "PROVIDER" ? "Provider tools enabled." : "Customer tools enabled.", {
      redirectTo: target === "PROVIDER" ? "/dashboard/provider-profile/setup" : "/dashboard",
    });
  });
}
