import { isStaffRole } from "@ucommerz/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Eye, MapPin, MessageSquare, Clock, Wifi } from "lucide-react";
import { PRICE_UNIT_LABELS, type PriceUnit } from "@ucommerz/shared";
import { getAuth } from "@/app/lib/guards";
import { getCategories, getRelatedServices, getServiceById, getServiceReviews, categoryName } from "@/app/lib/queries";
import { getFavoriteIds, safely } from "@/app/lib/queries-extra";
import { absoluteUrl, formatCurrency, initials, isUuid, truncate } from "@/app/lib/utils";
import { avatarOf, serviceImage } from "@/app/lib/media";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { ReviewStars } from "@/app/components/ReviewStars";
import { ReviewsList } from "@/app/components/ReviewsList";
import { BookingForm } from "@/app/components/BookingForm";
import { ServiceCard } from "@/app/components/ServiceCard";
import { ShareButton } from "@/app/components/ShareButton";
import { FavoriteButton } from "@/app/components/FavoriteButton";
import { ReportButton } from "@/app/components/ReportButton";
import { ServiceMap } from "@/app/components/Map";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) return { title: "Service not found" };
  const service = await safely(() => getServiceById(id), null);
  if (!service) return { title: "Service not found" };
  const title = service.title;
  const description = truncate(service.description, 155) || `Book ${service.title} on UCOMMERZ.`;
  const image = serviceImage(service);
  return {
    title,
    description,
    alternates: { canonical: `/services/${service.id}` },
    openGraph: { title, description, type: "website", url: absoluteUrl(`/services/${service.id}`), images: [{ url: image.startsWith("http") ? image : absoluteUrl(image) }] },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const service = await getServiceById(id);
  if (!service || (service.status !== "ACTIVE" && !(await canSeeInactive(service.provider_id)))) notFound();

  const { supabase, user, profile } = await getAuth();
  // Fire-and-forget view counter (RPC ignores the owner's own views).
  void Promise.resolve(supabase.rpc("increment_service_views", { p_service_id: service.id })).catch(() => undefined);

  const [categories, reviews, related, favorites] = await Promise.all([
    safely(getCategories, []),
    safely(() => getServiceReviews(service.id), []),
    safely(() => getRelatedServices(service, 3), []),
    safely(() => getFavoriteIds(supabase, user?.id), new Set<string>()),
  ]);

  const isOwner = profile?.id === service.provider_id;
  const state = !profile ? "guest" : isOwner ? "owner" : profile.role === "PROVIDER" ? "no-seeker" : "ready";
  const unit = PRICE_UNIT_LABELS[service.price_unit as PriceUnit];
  const images = service.images?.length ? service.images : [serviceImage(service)];
  const lat = service.service_latitude ?? service.latitude;
  const lng = service.service_longitude ?? service.longitude;
  const provider = service.provider;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: truncate(service.description, 300),
    category: categoryName(categories, service.category),
    image: images.map((i) => (i.startsWith("http") ? i : absoluteUrl(i))),
    url: absoluteUrl(`/services/${service.id}`),
    provider: provider ? { "@type": "Person", name: provider.full_name, url: provider.slug ? absoluteUrl(`/provider/${provider.slug}`) : undefined } : undefined,
    areaServed: service.location ?? undefined,
    offers: { "@type": "Offer", price: service.price, priceCurrency: "USD", availability: "https://schema.org/InStock" },
    ...(service.total_reviews > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: service.rating, reviewCount: service.total_reviews } } : {}),
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="mb-4 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/browse" className="hover:text-foreground">Browse</Link>
        {service.category && (
          <>
            {" / "}
            <Link href={`/categories/${service.category}`} className="hover:text-foreground">{categoryName(categories, service.category)}</Link>
          </>
        )}
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-8">
          <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl border bg-muted">
              <img src={images[0]} alt={service.title} className="aspect-[16/9] w-full object-cover" />
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {images.slice(1, 5).map((src, i) => (
                  <img key={src + i} src={src} alt={`${service.title} photo ${i + 2}`} loading="lazy" className="aspect-[4/3] rounded-lg border object-cover" />
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{categoryName(categories, service.category)}</Badge>
                  {service.is_remote && <Badge variant="info"><Wifi className="size-3" /> Remote</Badge>}
                  {service.featured && <Badge variant="warning">Featured</Badge>}
                  {service.status !== "ACTIVE" && <Badge variant="muted">{service.status}</Badge>}
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{service.title}</h1>
              </div>
              <div className="flex items-center gap-2">
                {profile && !isOwner && <FavoriteButton serviceId={service.id} initialFavorite={favorites.has(service.id)} />}
                <ShareButton title={service.title} text={truncate(service.description, 100)} url={`/services/${service.id}`} />
                {!isOwner && <ReportButton targetType="SERVICE" targetId={service.id} signedIn={Boolean(profile)} />}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <ReviewStars rating={service.rating} count={service.total_reviews} />
              {service.location && <span className="flex items-center gap-1"><MapPin className="size-4" />{service.location}</span>}
              <span className="flex items-center gap-1"><Eye className="size-4" />{service.views} views</span>
              {(service.min_duration || service.max_duration) && (
                <span className="flex items-center gap-1"><Clock className="size-4" />{service.min_duration ?? "—"}–{service.max_duration ?? "—"} h</span>
              )}
            </div>
          </div>

          <section aria-labelledby="about-heading">
            <h2 id="about-heading" className="mb-3 font-display text-lg font-semibold">About this service</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{service.description}</p>
          </section>

          {lat != null && lng != null && (
            <section aria-labelledby="area-heading">
              <h2 id="area-heading" className="mb-3 font-display text-lg font-semibold">Service area</h2>
              <div className="overflow-hidden rounded-xl border">
                <ServiceMap
                  markers={[{ id: service.id, lat, lng, title: service.title, subtitle: service.service_address ?? service.location ?? undefined }]}
                  radiusKm={service.service_radius ? Number(service.service_radius) : null}
                  height={300}
                  zoom={service.service_radius ? 10 : 13}
                />
              </div>
              {service.service_radius ? <p className="mt-2 text-xs text-muted-foreground">Serves customers within {Number(service.service_radius)} km.</p> : null}
            </section>
          )}

          <section aria-labelledby="reviews-heading">
            <h2 id="reviews-heading" className="mb-3 font-display text-lg font-semibold">Reviews ({service.total_reviews})</h2>
            <ReviewsList reviews={reviews} viewerId={profile?.id} />
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-baseline gap-2">
                <CardTitle className="font-display text-3xl text-primary">{formatCurrency(service.price)}</CardTitle>
                <span className="text-sm text-muted-foreground">{unit}</span>
              </div>
            </CardHeader>
            <CardContent>
              {service.status === "ACTIVE" ? (
                <BookingForm
                  state={state}
                  service={{ id: service.id, title: service.title, price: Number(service.price), price_unit: service.price_unit, min_duration: service.min_duration ? Number(service.min_duration) : null, max_duration: service.max_duration ? Number(service.max_duration) : null }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">This service is not currently accepting bookings.</p>
              )}
            </CardContent>
          </Card>

          {provider && (
            <Card>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-12">
                    <AvatarImage src={avatarOf(provider.avatar_url)} alt="" />
                    <AvatarFallback>{initials(provider.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 font-semibold">
                      <span className="truncate">{provider.full_name}</span>
                      {provider.verified && <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verified" />}
                    </p>
                    <ReviewStars rating={provider.rating} count={provider.total_reviews} size={12} />
                  </div>
                </div>
                {provider.bio && <p className="line-clamp-3 text-sm text-muted-foreground">{provider.bio}</p>}
                <div className="flex gap-2">
                  {provider.slug && (
                    <Button asChild variant="outline" size="sm" className="flex-1"><Link href={`/provider/${provider.slug}`}>View profile</Link></Button>
                  )}
                  {profile && !isOwner && (
                    <Button asChild size="sm" className="flex-1"><Link href={`/dashboard/messages?to=${provider.id}&service=${service.id}`}><MessageSquare /> Message</Link></Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-12" aria-labelledby="related-heading">
          <h2 id="related-heading" className="mb-4 font-display text-xl font-semibold">Similar services</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((s) => (
              <ServiceCard key={s.id} service={s} categoryLabel={categoryName(categories, s.category)} showFavorite={Boolean(profile)} favorite={favorites.has(s.id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** Non-active services are visible only to their provider and admins (RLS enforces it; this avoids empty shells). */
async function canSeeInactive(providerId: string): Promise<boolean> {
  const { profile } = await getAuth();
  return Boolean(profile && (profile.id === providerId || isStaffRole(profile.role)));
}
