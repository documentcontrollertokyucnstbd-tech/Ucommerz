import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PAGE_SIZE,
  PROVIDER_ROLES,
  type Category,
  type CategoryNode,
  type ReviewWithReviewer,
  type Service,
  type ServiceFilters,
  type ServiceWithProvider,
  type UserProfile,
} from "@ucommerz/shared";
import { createClient } from "@/app/lib/supabase/server";
import { sanitizeSearch } from "@/app/lib/utils";
import { boundingBox, filterByProximity } from "@/app/lib/proximity-search";

/** Columns that are safe/public for a user shown next to a service. */
export const PUBLIC_USER_COLUMNS = "id, full_name, avatar_url, slug, rating, total_reviews, verified, location, bio";
export const SERVICE_WITH_PROVIDER = `*, provider:users!services_provider_id_fkey(${PUBLIC_USER_COLUMNS})`;

async function db(): Promise<SupabaseClient> {
  return (await createClient()) as unknown as SupabaseClient;
}

/* ---------------- categories ---------------- */
export async function getCategories(): Promise<Category[]> {
  const supabase = await db();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("order_position", { ascending: true });
  return (data as Category[]) ?? [];
}

/** Top-level categories with children and ACTIVE service counts. */
export async function getCategoryTree(): Promise<CategoryNode[]> {
  const supabase = await db();
  const [categories, { data: services }] = await Promise.all([
    getCategories(),
    supabase.from("services").select("category, sub_category").eq("status", "ACTIVE"),
  ]);
  const rows = (services as { category: string | null; sub_category: string | null }[]) ?? [];
  const parents = categories.filter((c) => !c.parent_id);
  return parents.map((p) => {
    const children = categories.filter((c) => c.parent_id === p.id);
    return {
      ...p,
      children,
      service_count: rows.filter((s) => s.category === p.slug).length,
    };
  });
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await db();
  const { data } = await supabase.from("categories").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
  return (data as Category | null) ?? null;
}

export function categoryName(categories: Category[], slug: string | null | undefined): string {
  if (!slug) return "General";
  return categories.find((c) => c.slug === slug)?.name ?? slug.replace(/-/g, " ");
}

/* ---------------- services ---------------- */
export async function searchServices(
  filters: ServiceFilters & { lat?: number; lng?: number; radiusKm?: number },
): Promise<{ services: ServiceWithProvider[]; total: number; page: number; pageSize: number }> {
  const supabase = await db();
  const page = Math.max(1, filters.page ?? 1);
  const nearby = filters.lat != null && filters.lng != null;

  let query = supabase.from("services").select(SERVICE_WITH_PROVIDER, { count: "exact" }).eq("status", "ACTIVE");

  if (filters.q) {
    const q = sanitizeSearch(filters.q);
    if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%,location.ilike.%${q}%`);
  }
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.subCategory) query = query.eq("sub_category", filters.subCategory);
  if (filters.minPrice != null) query = query.gte("price", filters.minPrice);
  if (filters.maxPrice != null) query = query.lte("price", filters.maxPrice);
  if (filters.minRating != null) query = query.gte("rating", filters.minRating);
  if (filters.remote) query = query.eq("is_remote", true);

  if (nearby) {
    const box = boundingBox(filters.lat!, filters.lng!, filters.radiusKm ?? 25);
    query = query
      .gte("latitude", box.minLat)
      .lte("latitude", box.maxLat)
      .gte("longitude", box.minLng)
      .lte("longitude", box.maxLng);
  }

  switch (filters.sort) {
    case "price-low":
      query = query.order("price", { ascending: true });
      break;
    case "price-high":
      query = query.order("price", { ascending: false });
      break;
    case "rating":
      query = query.order("rating", { ascending: false }).order("total_reviews", { ascending: false });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    default:
      query = query.order("featured", { ascending: false }).order("rating", { ascending: false });
  }

  if (nearby) {
    // Distance filtering/sorting needs all candidates inside the bounding box.
    const { data, count, error } = await query.limit(300);
    if (error) throw new Error(error.message);
    const all = filterByProximity((data as ServiceWithProvider[]) ?? [], filters.lat!, filters.lng!, filters.radiusKm ?? 25, {
      respectServiceRadius: true,
    });
    const start = (page - 1) * PAGE_SIZE;
    return { services: all.slice(start, start + PAGE_SIZE), total: all.length || (count ?? 0), page, pageSize: PAGE_SIZE };
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) throw new Error(error.message);
  return { services: (data as ServiceWithProvider[]) ?? [], total: count ?? 0, page, pageSize: PAGE_SIZE };
}

export async function getFeaturedServices(limit = 4): Promise<ServiceWithProvider[]> {
  const supabase = await db();
  const { data } = await supabase
    .from("services")
    .select(SERVICE_WITH_PROVIDER)
    .eq("status", "ACTIVE")
    .order("featured", { ascending: false })
    .order("rating", { ascending: false })
    .limit(limit);
  return (data as ServiceWithProvider[]) ?? [];
}

export async function getServiceById(id: string): Promise<ServiceWithProvider | null> {
  const supabase = await db();
  const { data } = await supabase.from("services").select(SERVICE_WITH_PROVIDER).eq("id", id).maybeSingle();
  return (data as ServiceWithProvider | null) ?? null;
}

export async function getServiceReviews(serviceId: string, limit = 20): Promise<ReviewWithReviewer[]> {
  const supabase = await db();
  const { data } = await supabase
    .from("reviews")
    .select("*, reviewer:users!reviews_reviewer_id_fkey(id, full_name, avatar_url)")
    .eq("service_id", serviceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as ReviewWithReviewer[]) ?? [];
}

export async function getServicesByProvider(providerId: string): Promise<Service[]> {
  const supabase = await db();
  const { data } = await supabase
    .from("services")
    .select("*")
    .eq("provider_id", providerId)
    .eq("status", "ACTIVE")
    .order("rating", { ascending: false });
  return (data as Service[]) ?? [];
}

export async function getRelatedServices(service: Service, limit = 3): Promise<ServiceWithProvider[]> {
  const supabase = await db();
  let q = supabase.from("services").select(SERVICE_WITH_PROVIDER).eq("status", "ACTIVE").neq("id", service.id).limit(limit);
  if (service.category) q = q.eq("category", service.category);
  const { data } = await q.order("rating", { ascending: false });
  return (data as ServiceWithProvider[]) ?? [];
}

/* ---------------- providers ---------------- */
export async function getFeaturedProviders(limit = 4): Promise<UserProfile[]> {
  const supabase = await db();
  const { data } = await supabase
    .from("users")
    .select(PUBLIC_USER_COLUMNS + ", role, is_active, social_links, website, latitude, longitude, created_at, updated_at")
    .in("role", PROVIDER_ROLES as unknown as string[])
    .eq("is_active", true)
    .eq("verified", true)
    .order("rating", { ascending: false })
    .limit(limit);
  return (data as unknown as UserProfile[]) ?? [];
}

export async function getProviderBySlug(slug: string): Promise<UserProfile | null> {
  const supabase = await db();
  const { data } = await supabase
    .from("users")
    .select(PUBLIC_USER_COLUMNS + ", role, is_active, social_links, website, latitude, longitude, created_at, updated_at")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return (data as unknown as UserProfile | null) ?? null;
}

export async function getProviderById(id: string): Promise<UserProfile | null> {
  const supabase = await db();
  const { data } = await supabase
    .from("users")
    .select(PUBLIC_USER_COLUMNS + ", role, is_active, social_links, website, latitude, longitude, created_at, updated_at")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  return (data as unknown as UserProfile | null) ?? null;
}