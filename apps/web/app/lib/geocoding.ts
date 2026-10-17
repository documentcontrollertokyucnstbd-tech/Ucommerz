export type GeocodeResult = {
  latitude: number;
  longitude: number;
  formattedAddress: string;
};

/**
 * Browser geocoding through the Google Maps JS API (works with a
 * referrer-restricted public key). Call from Client Components only.
 */
export async function geocodeAddressClient(address: string): Promise<GeocodeResult | null> {
  const query = address.trim();
  if (!query) return null;
  const { loadGoogleMaps } = await import("@/app/lib/google-maps-loader");
  const g = await loadGoogleMaps();
  const geocoder = new g.maps.Geocoder();
  return new Promise((resolve) => {
    geocoder.geocode({ address: query }, (results, status) => {
      const first = results?.[0];
      if (status === "OK" && first) {
        resolve({
          latitude: first.geometry.location.lat(),
          longitude: first.geometry.location.lng(),
          formattedAddress: first.formatted_address,
        });
      } else {
        resolve(null);
      }
    });
  });
}

/** Reverse geocoding in the browser. */
export async function reverseGeocodeClient(lat: number, lng: number): Promise<string | null> {
  const { loadGoogleMaps } = await import("@/app/lib/google-maps-loader");
  const g = await loadGoogleMaps();
  const geocoder = new g.maps.Geocoder();
  return new Promise((resolve) => {
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      resolve(status === "OK" && results?.[0] ? results[0].formatted_address : null);
    });
  });
}

/**
 * Server-side geocoding over the REST API. Works only when the key allows
 * server requests (no HTTP-referrer restriction); otherwise returns null and
 * callers fall back to the coordinates the browser already resolved.
 */
export async function geocodeAddressServer(address: string): Promise<GeocodeResult | null> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const query = address.trim();
  if (!key || !query) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${key}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      status: string;
      results?: { formatted_address: string; geometry: { location: { lat: number; lng: number } } }[];
    };
    const first = json.results?.[0];
    if (json.status !== "OK" || !first) return null;
    return {
      latitude: first.geometry.location.lat,
      longitude: first.geometry.location.lng,
      formattedAddress: first.formatted_address,
    };
  } catch {
    return null;
  }
}
