import type { ServiceFilters } from "@ucommerz/shared";
import type { BrowseValues } from "@/app/components/BrowseFilters";
import { first, toNumber } from "@/app/lib/utils";

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export function parseBrowseParams(sp: SearchParamsRecord) {
  const num = (k: string) => {
    const v = first(sp[k]);
    if (v === undefined || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const sort = first(sp.sort);
  const allowedSort = ["featured", "price-low", "price-high", "rating", "newest"] as const;
  const filters: ServiceFilters & { lat?: number; lng?: number; radiusKm?: number } = {
    q: first(sp.q)?.slice(0, 100),
    category: first(sp.category),
    minPrice: num("minPrice"),
    maxPrice: num("maxPrice"),
    minRating: num("minRating"),
    remote: first(sp.remote) === "1" ? true : undefined,
    sort: allowedSort.find((s) => s === sort),
    page: Math.max(1, Math.floor(toNumber(first(sp.page), 1))),
    lat: num("lat"),
    lng: num("lng"),
    radiusKm: num("radius"),
  };
  const values: BrowseValues = {
    q: first(sp.q) ?? "",
    category: first(sp.category) ?? "",
    minPrice: first(sp.minPrice) ?? "",
    maxPrice: first(sp.maxPrice) ?? "",
    minRating: first(sp.minRating) ?? "",
    remote: first(sp.remote) ?? "",
    sort: first(sp.sort) ?? "",
    lat: first(sp.lat) ?? "",
    lng: first(sp.lng) ?? "",
    radius: first(sp.radius) ?? "",
  };
  return { filters, values };
}

