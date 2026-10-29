"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/app/lib/utils";

/** Read-only star display. */
export function ReviewStars({
  rating,
  count,
  size = 14,
  showValue = true,
  className,
}: {
  rating: number | null | undefined;
  count?: number | null;
  size?: number;
  showValue?: boolean;
  className?: string;
}) {
  const t = useTranslations("PubStars");
  const value = Number(rating ?? 0);
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            width={size}
            height={size}
            className={cn(i < Math.round(value) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/40")}
          />
        ))}
      </span>
      {showValue && <span className="text-sm font-semibold text-foreground">{value.toFixed(1)}</span>}
      {count != null && <span className="text-sm text-muted-foreground">({count})</span>}
      <span className="sr-only">{count != null ? t("ratedWithCount", { value: value.toFixed(1), count }) : t("rated", { value: value.toFixed(1) })}</span>
    </div>
  );
}

/** Interactive 1–5 star input (used in the review form). */
export function StarInput({
  value,
  onChange,
  size = 24,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  size?: number;
  label?: string;
}) {
  const t = useTranslations("PubStars");
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div role="radiogroup" aria-label={label ?? t("rating")} className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={t("starsLabel", { count: n })}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onFocus={() => setHover(n)}
          onBlur={() => setHover(0)}
          onClick={() => onChange(n)}
          className="rounded p-0.5 outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Star width={size} height={size} className={cn(n <= active ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/40")} />
        </button>
      ))}
    </div>
  );
}
