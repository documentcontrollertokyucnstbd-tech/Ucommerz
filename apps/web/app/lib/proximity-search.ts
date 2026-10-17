import type { ServiceWithProvider } from "@ucommerz/shared";

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two coordinates (haversine formula), in kilometres. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Bounding box around a point; lets the database pre-filter before haversine runs. */
export function boundingBox(lat: number, lng: number, radiusKm: number) {
  const latDelta = (radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI);
  const lngDelta = latDelta / Math.max(0.01, Math.cos(toRad(lat)));
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

type Located = { latitude: number | null; longitude: number | null; service_radius?: number | null; is_remote?: boolean };

/**
 * Filters and sorts services by distance from (lat, lng).
 *  - `radiusKm`: maximum distance from the searcher.
 *  - `respectServiceRadius`: also require the searcher to be inside the provider's own service radius.
 *  - remote services are kept (distance undefined) when `includeRemote` is true.
 */
export function filterByProximity<T extends Located>(
  items: T[],
  lat: number,
  lng: number,
  radiusKm: number,
  opts: { respectServiceRadius?: boolean; includeRemote?: boolean } = {},
): (T & { distance_km?: number })[] {
  const out: (T & { distance_km?: number })[] = [];
  for (const item of items) {
    if (item.latitude == null || item.longitude == null) {
      if (opts.includeRemote && item.is_remote) out.push({ ...item });
      continue;
    }
    const d = haversineKm(lat, lng, item.latitude, item.longitude);
    if (d > radiusKm) continue;
    if (opts.respectServiceRadius && item.service_radius && d > Number(item.service_radius)) continue;
    out.push({ ...item, distance_km: Math.round(d * 10) / 10 });
  }
  return out.sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity));
}

export function formatDistance(km: number | undefined | null): string {
  if (km == null) return "";
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km away`;
}

export type NearbyService = ServiceWithProvider;
