"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { hasMapsKey, loadGoogleMaps } from "@/app/lib/google-maps-loader";
import { cn } from "@/app/lib/utils";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  href?: string;
};

type Props = {
  markers: MapMarker[];
  /** Defaults to the first marker, or the centre of all markers. */
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: number | string;
  /** Draws a service-area circle (km) around the first marker. */
  radiusKm?: number | null;
  className?: string;
  /** Called when the user clicks the map (used by location pickers). */
  onPick?: (pos: { lat: number; lng: number }) => void;
};

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

/** Google Map with markers, info windows and an optional service-radius circle. Falls back gracefully without an API key. */
export function Map({ markers, center, zoom = 12, height = 320, radiusKm, className, onPick }: Props) {
  const t = useTranslations("PubMap");
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(hasMapsKey() ? "loading" : "error");
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  const signature = markers.map((m) => `${m.id}:${m.lat}:${m.lng}`).join("|");

  useEffect(() => {
    if (!hasMapsKey() || !ref.current) return;
    let cancelled = false;
    const listeners: google.maps.MapsEventListener[] = [];
    const overlays: { setMap: (m: google.maps.Map | null) => void }[] = [];

    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !ref.current) return;
        const first = markers[0];
        const c = center ?? (first ? { lat: first.lat, lng: first.lng } : { lat: 37.7749, lng: -122.4194 });
        const map = new g.maps.Map(ref.current, {
          center: c,
          zoom,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
        });

        const info = new g.maps.InfoWindow();
        const bounds = new g.maps.LatLngBounds();

        for (const m of markers) {
          const marker = new g.maps.Marker({ position: { lat: m.lat, lng: m.lng }, map, title: m.title });
          overlays.push(marker);
          bounds.extend({ lat: m.lat, lng: m.lng });
          listeners.push(
            marker.addListener("click", () => {
              const link = m.href ? `<a href="${esc(m.href)}" style="color:#4f46e5;font-weight:600">${esc(t("viewDetails"))}</a>` : "";
              info.setContent(
                `<div style="font-family:system-ui,sans-serif;max-width:220px;color:#0f172a"><strong>${esc(m.title)}</strong>${
                  m.subtitle ? `<div style="font-size:12px;color:#475569;margin:2px 0 6px">${esc(m.subtitle)}</div>` : ""
                }${link}</div>`,
              );
              info.open({ map, anchor: marker });
            }),
          );
        }

        if (radiusKm && first) {
          const circle = new g.maps.Circle({
            map,
            center: { lat: first.lat, lng: first.lng },
            radius: radiusKm * 1000,
            strokeColor: "#6366f1",
            strokeOpacity: 0.7,
            strokeWeight: 1.5,
            fillColor: "#6366f1",
            fillOpacity: 0.12,
            clickable: false,
          });
          overlays.push(circle);
          const b = circle.getBounds();
          if (b) map.fitBounds(b);
        } else if (markers.length > 1) {
          map.fitBounds(bounds, 48);
        }

        if (pickRef.current) {
          listeners.push(
            map.addListener("click", (e: google.maps.MapMouseEvent) => {
              if (e.latLng) pickRef.current?.({ lat: e.latLng.lat(), lng: e.latLng.lng() });
            }),
          );
        }
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));

    return () => {
      cancelled = true;
      listeners.forEach((l) => l.remove());
      overlays.forEach((o) => o.setMap(null));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, radiusKm, zoom, center?.lat, center?.lng]);

  const first = markers[0];

  if (status === "error") {
    return (
      <div
        style={{ height }}
        className={cn("flex flex-col items-center justify-center gap-2 rounded-xl border bg-muted/50 p-4 text-center text-sm text-muted-foreground", className)}
      >
        <MapPin className="size-6 text-primary" />
        <p>{hasMapsKey() ? t("loadFailed") : t("noKey")}</p>
        {first && (
          <a
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            href={`https://www.google.com/maps/search/?api=1&query=${first.lat},${first.lng}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("openInGoogle")} <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>
    );
  }

  return (
    <div style={{ height }} className={cn("relative overflow-hidden rounded-xl border bg-muted", className)}>
      <div ref={ref} className="size-full" aria-label={t("label")} />
      {status === "loading" && <div className="absolute inset-0 animate-pulse bg-muted" />}
    </div>
  );
}

export { Map as ServiceMap };
