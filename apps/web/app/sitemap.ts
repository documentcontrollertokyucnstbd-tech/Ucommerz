import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { getSiteUrl } from "@/app/lib/site-url";

export const revalidate = 3600;

const base = getSiteUrl();

/** Anonymous client: the sitemap only needs public rows and must not depend on cookies. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/browse`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/categories`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return entries;

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const [services, providers, categories] = await Promise.all([
      supabase.from("services").select("id, updated_at").eq("status", "ACTIVE").order("updated_at", { ascending: false }).limit(5000),
      supabase.from("users").select("slug, updated_at").in("role", ["PROVIDER", "BOTH"]).eq("is_active", true).not("slug", "is", null).limit(5000),
      supabase.from("categories").select("slug, updated_at").eq("is_active", true),
    ]);
    for (const c of categories.data ?? []) entries.push({ url: `${base}/categories/${c.slug}`, lastModified: new Date(c.updated_at), changeFrequency: "weekly", priority: 0.6 });
    for (const s of services.data ?? []) entries.push({ url: `${base}/services/${s.id}`, lastModified: new Date(s.updated_at), changeFrequency: "weekly", priority: 0.8 });
    for (const p of providers.data ?? []) entries.push({ url: `${base}/provider/${p.slug}`, lastModified: new Date(p.updated_at), changeFrequency: "weekly", priority: 0.6 });
  } catch (error) {
    console.error("[sitemap]", error);
  }
  return entries;
}
