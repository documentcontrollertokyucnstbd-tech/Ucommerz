import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { PROVIDER_ROLES, SEEKER_ROLES, isStaffRole, type UserProfile, type UserRole } from "@ucommerz/shared";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/app/lib/supabase/admin";

export type AuthContext = {
  profile: UserProfile;
  user: User;
  supabase: SupabaseClient;
};

/**
 * Resolves the session once per request (React `cache`).
 * `getUser()` validates the JWT with Supabase Auth (getSession is not trusted server-side).
 */
export const getAuth = cache(async () => {
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null as User | null, profile: null as UserProfile | null };
  }

  const { data } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle();
  let profile = (data as UserProfile | null) ?? null;

  // Self-heal: the signup trigger should have created the row; if missing, create it.
  if (!profile && hasServiceRole()) {
    try {
      const admin = createAdminClient();
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const metaRole = typeof meta.role === "string" ? meta.role : "SEEKER";
      const role: UserRole = ["PROVIDER", "SEEKER", "BOTH"].includes(metaRole) ? (metaRole as UserRole) : "SEEKER";
      const { data: created } = await admin
        .from("users")
        .upsert(
          {
            id: user.id,
            email: user.email ?? "",
            full_name: (typeof meta.full_name === "string" && meta.full_name) || (user.email ?? "").split("@")[0],
            role,
          },
          { onConflict: "id" },
        )
        .select("*")
        .maybeSingle();
      profile = (created as UserProfile | null) ?? null;
    } catch {
      profile = null;
    }
  }

  return { supabase, user, profile };
});

/** Current active profile or null (safe on public pages). */
export async function getCurrentProfile(): Promise<UserProfile | null> {
  const { profile } = await getAuth();
  return profile && profile.is_active ? profile : null;
}

function loginUrl(next?: string, error?: string) {
  const params = new URLSearchParams();
  if (next) params.set("next", next);
  if (error) params.set("error", error);
  const q = params.toString();
  return `/login${q ? `?${q}` : ""}`;
}

/** Any signed-in, active user. Redirects to /login otherwise. */
export async function requireUser(next?: string): Promise<AuthContext> {
  const { supabase, user, profile } = await getAuth();
  if (!user) redirect(loginUrl(next));
  if (!profile) redirect(loginUrl(next, "profile-missing"));
  if (!profile.is_active) redirect(loginUrl(undefined, "suspended"));
  return { profile, user, supabase };
}

/** Signed-in user whose role is one of `roles`. */
export async function requireRole(roles: readonly UserRole[], next?: string): Promise<AuthContext> {
  const ctx = await requireUser(next);
  if (isStaffRole(ctx.profile.role)) redirect("/admin");
  if (!roles.includes(ctx.profile.role)) redirect("/dashboard?denied=1");
  return ctx;
}

export const requireProvider = (next?: string) => requireRole(PROVIDER_ROLES, next);
export const requireSeeker = (next?: string) => requireRole(SEEKER_ROLES, next);

/** Staff (ADMIN moderators and SUPERADMINs). Everyone else gets a 404 so the panel's existence is not revealed. */
export async function requireAdmin(): Promise<AuthContext> {
  const { supabase, user, profile } = await getAuth();
  if (!user) redirect(loginUrl("/admin"));
  if (!profile || !profile.is_active || !isStaffRole(profile.role)) notFound();
  return { profile, user, supabase };
}

/** SUPERADMIN only: categories, platform/email settings, security, role changes, hard deletes. */
export async function requireSuperAdmin(): Promise<AuthContext> {
  const ctx = await requireAdmin();
  if (ctx.profile.role !== "SUPERADMIN") redirect("/admin?denied=1");
  return ctx;
}

export function canProvide(profile: Pick<UserProfile, "role">): boolean {
  return PROVIDER_ROLES.includes(profile.role);
}

export function canBook(profile: Pick<UserProfile, "role">): boolean {
  return SEEKER_ROLES.includes(profile.role);
}
