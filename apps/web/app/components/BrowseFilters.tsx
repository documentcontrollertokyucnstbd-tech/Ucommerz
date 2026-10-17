"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Crosshair, Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import type { Category } from "@ucommerz/shared";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";

export type BrowseValues = {
  q?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
  remote?: string;
  sort?: string;
  lat?: string;
  lng?: string;
  radius?: string;
};

const ALL = "__all";

export function BrowseFilters({ categories, values, basePath = "/browse", lockCategory = false }: { categories: Category[]; values: BrowseValues; basePath?: string; lockCategory?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<BrowseValues>(values);
  const [locating, setLocating] = useState(false);

  const set = (patch: BrowseValues) => setState((s) => ({ ...s, ...patch }));

  function apply(next: BrowseValues = state) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) {
      if (v && v !== ALL && !(k === "category" && lockCategory)) sp.set(k, v);
    }
    const qs = sp.toString();
    startTransition(() => {
      router.push(`${basePath || pathname}${qs ? `?${qs}` : ""}`);
      setOpen(false);
    });
  }

  function reset() {
    const cleared: BrowseValues = {};
    setState(cleared);
    apply(cleared);
  }

  function nearMe() {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const next = { ...state, lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5), radius: state.radius || "25", sort: undefined };
        setState(next);
        apply(next);
        toast.success("Showing services near you.");
      },
      (err) => {
        setLocating(false);
        toast.error(err.code === err.PERMISSION_DENIED ? "Location permission was denied." : "Could not get your location.");
      },
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  }

  const parents = categories.filter((c) => !c.parent_id);
  const hasActive = Object.entries(values).some(([k, v]) => Boolean(v) && k !== "radius");
  const nearActive = Boolean(state.lat && state.lng);
  const activeCount = Object.entries(values).filter(([k, v]) => Boolean(v) && k !== "q" && k !== "radius" && !(k === "category" && lockCategory)).length;

  const section = "grid gap-2.5 border-b border-border/70 pb-4 last:border-0 last:pb-0";
  const heading = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

  const panel = (
    <div className="grid gap-4">
      <div className={section}>
        <p className={heading}>Sort by</p>
        <Select value={state.sort || "featured"} onValueChange={(v) => set({ sort: v })}>
          <SelectTrigger id="bf-sort" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="featured">Featured</SelectItem>
            <SelectItem value="rating">Top rated</SelectItem>
            <SelectItem value="price-low">Price: low to high</SelectItem>
            <SelectItem value="price-high">Price: high to low</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {!lockCategory && (
        <div className={section}>
          <p className={heading}>Category</p>
          <Select value={state.category || ALL} onValueChange={(v) => set({ category: v === ALL ? "" : v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {parents.map((c) => (
                <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className={section}>
        <p className={heading}>Price range</p>
        <div className="flex items-center gap-2">
          <Input aria-label="Minimum price" inputMode="decimal" type="number" min={0} placeholder="Min" value={state.minPrice ?? ""} onChange={(e) => set({ minPrice: e.target.value })} />
          <span className="text-muted-foreground">–</span>
          <Input aria-label="Maximum price" inputMode="decimal" type="number" min={0} placeholder="Max" value={state.maxPrice ?? ""} onChange={(e) => set({ maxPrice: e.target.value })} />
        </div>
      </div>
      <div className={section}>
        <p className={heading}>Rating &amp; type</p>
        <Select value={state.minRating || ALL} onValueChange={(v) => set({ minRating: v === ALL ? "" : v })}>
          <SelectTrigger aria-label="Minimum rating" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any rating</SelectItem>
            <SelectItem value="4.5">4.5 &amp; up</SelectItem>
            <SelectItem value="4">4.0 &amp; up</SelectItem>
            <SelectItem value="3">3.0 &amp; up</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={state.remote === "1"} onCheckedChange={(c) => set({ remote: c === true ? "1" : "" })} />
          Remote services only
        </label>
      </div>
      <div className={section}>
        <p className={heading}>Distance</p>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={state.radius || "25"} onValueChange={(v) => set({ radius: v })}>
            <SelectTrigger aria-label="Search radius" className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["5", "10", "25", "50", "100"].map((r) => (
                <SelectItem key={r} value={r}>{r} km</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant={nearActive ? "default" : "outline"} size="sm" className="flex-1" onClick={nearMe} disabled={locating}>
            {locating ? <Loader2 className="animate-spin" /> : <Crosshair />}
            {nearActive ? "Update location" : "Near me"}
          </Button>
          {nearActive && (
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Clear location" onClick={() => set({ lat: "", lng: "", radius: "" })}>
              <X />
            </Button>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" className="flex-1" onClick={() => apply()} disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} Apply filters
        </Button>
        {hasActive && (
          <Button type="button" variant="outline" onClick={reset}>Reset</Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
        className="flex items-center gap-1.5 rounded-xl border border-border bg-card p-1.5 shadow-sm transition focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15"
        role="search"
      >
        <Search className="ml-2.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          value={state.q ?? ""}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="Search services, skills or places…"
          className="h-9 min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
          aria-label="Search services"
        />
        {state.q && (
          <button type="button" aria-label="Clear search" onClick={() => set({ q: "" })} className="rounded p-1 text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        )}
        <Button type="submit" size="sm" className="h-9 px-4" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : "Search"}
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-9 lg:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <SlidersHorizontal /> {activeCount > 0 ? activeCount : ""}
        </Button>
      </form>
      <div className={open ? "block lg:hidden" : "hidden"}>
        <div className="rounded-xl border bg-card p-4 shadow-sm">{panel}</div>
      </div>
      <div className="hidden lg:block" data-desktop-filters>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="size-4 text-primary" /> Filters
            {activeCount > 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">{activeCount} active</span>}
          </div>
          {panel}
        </div>
      </div>
    </div>
  );
}
