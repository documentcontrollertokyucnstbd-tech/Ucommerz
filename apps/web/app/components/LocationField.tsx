"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { Crosshair, Loader2, MapPin, Search } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { geocodeAddressClient, reverseGeocodeClient } from "@/app/lib/geocoding";
import { hasMapsKey } from "@/app/lib/google-maps-loader";

export type LatLng = { latitude: number | null; longitude: number | null };

/** Address input with "Find on map" (geocode) and "Use my location" (browser geolocation + reverse geocode). */
export function LocationField({
  value,
  coords,
  onChange,
  placeholder,
  id,
}: {
  value: string;
  coords: LatLng;
  onChange: (address: string, coords: LatLng) => void;
  placeholder?: string;
  id?: string;
}) {
  const t = useTranslations("PubLocation");
  const [busy, setBusy] = useState<"geo" | "locate" | null>(null);

  async function geocode() {
    if (!value.trim()) return toast.error(t("enterAddress"));
    if (!hasMapsKey()) return toast.error(t("noKey"));
    setBusy("geo");
    try {
      const r = await geocodeAddressClient(value);
      if (!r) return toast.error(t("notFound"));
      onChange(r.formattedAddress || value, { latitude: r.latitude, longitude: r.longitude });
      toast.success(t("found"));
    } catch {
      toast.error(t("geocodeFailed"));
    } finally {
      setBusy(null);
    }
  }

  function locate() {
    if (!("geolocation" in navigator)) return toast.error(t("unsupported"));
    setBusy("locate");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        let address = value;
        try {
          address = (hasMapsKey() && (await reverseGeocodeClient(c.latitude, c.longitude))) || value;
        } catch {
          /* keep typed value */
        }
        onChange(address, c);
        setBusy(null);
        toast.success(t("usingCurrent"));
      },
      (err) => {
        setBusy(null);
        toast.error(err.code === err.PERMISSION_DENIED ? t("denied") : t("couldNotLocate"));
      },
      { timeout: 10_000 },
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <MapPin className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input id={id} className="ps-9" placeholder={placeholder ?? t("placeholder")} value={value} onChange={(e) => onChange(e.target.value, coords)} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={geocode} disabled={busy !== null}>
          {busy === "geo" ? <Loader2 className="animate-spin" /> : <Search />} {t("findOnMap")}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={locate} disabled={busy !== null}>
          {busy === "locate" ? <Loader2 className="animate-spin" /> : <Crosshair />} {t("useMyLocation")}
        </Button>
        {coords.latitude != null && coords.longitude != null && (
          <span className="text-xs text-muted-foreground">
            📍 {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
          </span>
        )}
      </div>
    </div>
  );
}
