"use client";

import { Loader } from "@googlemaps/js-api-loader";

let loaderPromise: Promise<typeof google> | null = null;

export function hasMapsKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
}

/** Loads the Google Maps JS API once and returns the `google` namespace. */
export function loadGoogleMaps(): Promise<typeof google> {
  if (!hasMapsKey()) {
    return Promise.reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set"));
  }
  if (!loaderPromise) {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      version: "weekly",
      libraries: ["places", "geocoding"],
    });
    loaderPromise = loader.load().catch((error) => {
      loaderPromise = null;
      throw error;
    });
  }
  return loaderPromise;
}
