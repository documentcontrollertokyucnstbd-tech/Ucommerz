import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/app/lib/site-url";

const base = getSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/api", "/profile", "/login", "/register", "/forgot-password", "/reset-password", "/auth"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
