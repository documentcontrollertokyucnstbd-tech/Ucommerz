import Link from "next/link";
import { MapPin } from "lucide-react";
import { PRICE_UNIT_LABELS, type PriceUnit, type ServiceWithProvider } from "@ucommerz/shared";
import { Badge } from "@/app/components/ui/badge";
import { ReviewStars } from "@/app/components/ReviewStars";
import { FavoriteButton } from "@/app/components/FavoriteButton";
import { serviceImage } from "@/app/lib/media";
import { formatCurrency } from "@/app/lib/utils";
import { formatDistance } from "@/app/lib/proximity-search";

export function ServiceCard({
  service,
  categoryLabel,
  favorite,
  showFavorite = false,
}: {
  service: ServiceWithProvider;
  categoryLabel?: string;
  favorite?: boolean;
  showFavorite?: boolean;
}) {
  const unit = PRICE_UNIT_LABELS[service.price_unit as PriceUnit] ?? service.price_unit;
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-lg">
      <Link href={`/services/${service.id}`} className="block">
        <div className="relative aspect-[1.45] overflow-hidden bg-muted">
          <img
            src={serviceImage(service)}
            alt={service.title}
            loading="lazy"
            className="size-full object-cover transition duration-500 group-hover:scale-105"
          />
          <span className="absolute left-3 top-3 rounded bg-slate-950/70 px-2 py-1 text-[10px] font-semibold uppercase text-white backdrop-blur">
            {categoryLabel ?? service.category?.replace(/-/g, " ") ?? "General"}
          </span>
          {service.featured && <Badge className="absolute bottom-3 left-3" variant="warning">Featured</Badge>}
        </div>
        <div className="p-4">
          <h3 className="line-clamp-1 text-sm font-semibold">{service.title}</h3>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">by {service.provider?.full_name ?? "Provider"}</p>
          <div className="mt-2 flex items-center gap-2">
            <ReviewStars rating={service.rating} count={service.total_reviews} />
          </div>
          {(service.location || service.distance_km != null) && (
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" />
              <span className="line-clamp-1">{service.distance_km != null ? formatDistance(service.distance_km) : service.location}</span>
              {service.is_remote && <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">Remote</span>}
            </p>
          )}
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
            <span className="text-muted-foreground">Starting at</span>
            <span className="font-bold text-primary">
              {formatCurrency(service.price)}
              <span className="font-normal text-muted-foreground"> {unit}</span>
            </span>
          </div>
        </div>
      </Link>
      {showFavorite && (
        <div className="absolute right-3 top-3">
          <FavoriteButton serviceId={service.id} initialFavorite={Boolean(favorite)} variant="floating" />
        </div>
      )}
    </div>
  );
}
