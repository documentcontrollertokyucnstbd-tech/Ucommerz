import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Award, BadgeCheck, ExternalLink, Globe, MapPin, MessageSquare, Calendar } from "lucide-react";
import type { PackageWithServices, ProviderCertification, ProviderPortfolioItem, ProviderSkill, ReviewWithReviewer } from "@ucommerz/shared";
import { getAuth } from "@/app/lib/guards";
import { getCategories, getProviderBySlug, getServicesByProvider, categoryName } from "@/app/lib/queries";
import { getFavoriteIds, safely } from "@/app/lib/queries-extra";
import { absoluteUrl, initials, truncate } from "@/app/lib/utils";
import { getFormat } from "@/app/lib/format-server";
import { avatarOf } from "@/app/lib/media";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { ReviewStars } from "@/app/components/ReviewStars";
import { ReviewsList } from "@/app/components/ReviewsList";
import { ServiceCard } from "@/app/components/ServiceCard";
import { ShareButton } from "@/app/components/ShareButton";
import { ReportButton } from "@/app/components/ReportButton";
import { BookPackageButton } from "@/app/components/BookPackageButton";
import { ServiceMap } from "@/app/components/Map";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTranslations("PubProvider");
  const provider = await safely(() => getProviderBySlug(slug), null);
  if (!provider) return { title: t("notFound") };
  const description = truncate(provider.bio, 155) || t("metaDescription", { name: provider.full_name ?? "" });
  return {
    title: provider.full_name ?? t("providerFallback"),
    description,
    alternates: { canonical: `/provider/${slug}` },
    openGraph: { title: provider.full_name ?? t("providerFallback"), description, url: absoluteUrl(`/provider/${slug}`), type: "profile", images: provider.avatar_url ? [provider.avatar_url] : undefined },
  };
}

export default async function ProviderPage({ params }: Props) {
  const f = await getFormat();
  const { slug } = await params;
  const t = await getTranslations("PubProvider");
  const provider = await getProviderBySlug(slug);
  if (!provider) notFound();

  const { supabase, user, profile } = await getAuth();
  const [categories, services, skills, certs, portfolio, packages, reviews, favorites] = await Promise.all([
    safely(getCategories, []),
    safely(() => getServicesByProvider(provider.id), []),
    safely(async () => ((await supabase.from("provider_skills").select("*").eq("provider_id", provider.id).order("years_experience", { ascending: false })).data ?? []) as ProviderSkill[], []),
    safely(async () => ((await supabase.from("provider_certifications").select("*").eq("provider_id", provider.id).order("issue_date", { ascending: false })).data ?? []) as ProviderCertification[], []),
    safely(async () => ((await supabase.from("provider_portfolio").select("*").eq("provider_id", provider.id).order("created_at", { ascending: false })).data ?? []) as ProviderPortfolioItem[], []),
    safely(async () => ((await supabase.from("packages").select("*, package_services(*, service:services(id, title, price, price_unit))").eq("provider_id", provider.id).eq("is_active", true)).data ?? []) as PackageWithServices[], []),
    safely(async () => ((await supabase.from("reviews").select("*, reviewer:users!reviews_reviewer_id_fkey(id, full_name, avatar_url)").eq("reviewee_id", provider.id).order("created_at", { ascending: false }).limit(20)).data ?? []) as ReviewWithReviewer[], []),
    safely(() => getFavoriteIds(supabase, user?.id), new Set<string>()),
  ]);

  const isOwner = profile?.id === provider.id;
  const pkgState = !profile ? "guest" : isOwner ? "owner" : "ready";
  const socials = Object.entries(provider.social_links ?? {}).filter(([, v]) => typeof v === "string" && v);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: provider.full_name,
    description: truncate(provider.bio, 300),
    image: provider.avatar_url ?? undefined,
    url: absoluteUrl(`/provider/${slug}`),
    address: provider.location ?? undefined,
    ...(provider.total_reviews > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: provider.rating, reviewCount: provider.total_reviews } } : {}),
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <header className="glass-card mb-8 flex flex-col gap-5 rounded-2xl border p-6 sm:flex-row sm:items-center">
        <Avatar className="size-24">
          <AvatarImage src={avatarOf(provider.avatar_url)} alt={provider.full_name ?? ""} />
          <AvatarFallback className="text-xl">{initials(provider.full_name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold sm:text-3xl">
            <span className="truncate">{provider.full_name}</span>
            {provider.verified && <BadgeCheck className="size-6 shrink-0 text-primary" aria-label={t("verifiedProvider")} />}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <ReviewStars rating={provider.rating} count={provider.total_reviews} />
            {provider.location && <span className="flex items-center gap-1"><MapPin className="size-4" />{provider.location}</span>}
            <span className="flex items-center gap-1"><Calendar className="size-4" />{t("joined", { date: f.date(provider.created_at, { month: "short", year: "numeric" }) })}</span>
          </div>
          {provider.bio && <p className="mt-3 max-w-3xl whitespace-pre-line text-sm text-foreground/90">{provider.bio}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {provider.website && (
              <Button asChild variant="outline" size="sm"><a href={provider.website} target="_blank" rel="noopener noreferrer nofollow"><Globe /> {t("website")}</a></Button>
            )}
            {socials.map(([k, v]) => (
              <Button key={k} asChild variant="outline" size="sm" className="capitalize">
                <a href={String(v)} target="_blank" rel="noopener noreferrer nofollow"><ExternalLink /> {k}</a>
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-col">
          {profile && !isOwner && (
            <Button asChild><Link href={`/dashboard/messages?to=${provider.id}`}><MessageSquare /> {t("message")}</Link></Button>
          )}
          {isOwner && <Button asChild variant="outline"><Link href="/dashboard/provider-profile">{t("editProfile")}</Link></Button>}
          <ShareButton title={t("shareTitle", { name: provider.full_name ?? "" })} url={`/provider/${slug}`} />
          {!isOwner && <ReportButton targetType="USER" targetId={provider.id} signedIn={Boolean(profile)} />}
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="services-h">
            <h2 id="services-h" className="mb-4 font-display text-xl font-semibold">{t("servicesHeading", { count: services.length })}</h2>
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noServices")}</p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {services.map((s) => (
                  <ServiceCard key={s.id} service={{ ...s, provider: { id: provider.id, full_name: provider.full_name, avatar_url: provider.avatar_url, slug: provider.slug, rating: provider.rating, total_reviews: provider.total_reviews, verified: provider.verified, location: provider.location, bio: provider.bio } }} categoryLabel={categoryName(categories, s.category)} showFavorite={Boolean(profile) && !isOwner} favorite={favorites.has(s.id)} />
                ))}
              </div>
            )}
          </section>

          {packages.length > 0 && (
            <section aria-labelledby="packages-h">
              <h2 id="packages-h" className="mb-4 font-display text-xl font-semibold">{t("packages")}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {packages.map((p) => (
                  <Card key={p.id}>
                    <CardHeader>
                      <CardTitle className="flex items-start justify-between gap-2 text-base">
                        <span>{p.title}</span>
                        {Number(p.discount_percentage) > 0 && <Badge variant="success">{t("save", { percent: Number(p.discount_percentage) })}</Badge>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {p.description && <p className="text-muted-foreground">{p.description}</p>}
                      <ul className="space-y-1 text-muted-foreground">
                        {p.package_services.map((ps) => (
                          <li key={ps.id}>• {ps.service?.title ?? t("serviceFallback")}{ps.quantity > 1 ? ` ×${ps.quantity}` : ""}</li>
                        ))}
                      </ul>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-primary">{f.currency(p.price)}</span>
                        <BookPackageButton packageId={p.id} title={p.title} state={pkgState} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {portfolio.length > 0 && (
            <section aria-labelledby="portfolio-h">
              <h2 id="portfolio-h" className="mb-4 font-display text-xl font-semibold">{t("portfolio")}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {portfolio.map((item) => (
                  <Card key={item.id} className="overflow-hidden py-0">
                    {item.image_urls[0] && <img src={item.image_urls[0]} alt={item.title} loading="lazy" className="aspect-[16/10] w-full object-cover" />}
                    <CardContent className="space-y-1 py-4">
                      <h3 className="font-semibold">{item.title}</h3>
                      {item.description && <p className="line-clamp-3 text-sm text-muted-foreground">{item.description}</p>}
                      {item.project_url && (
                        <a href={item.project_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                          {t("viewProject")} <ExternalLink className="size-3.5" />
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="reviews-h">
            <h2 id="reviews-h" className="mb-4 font-display text-xl font-semibold">{t("reviewsHeading", { count: provider.total_reviews })}</h2>
            <ReviewsList reviews={reviews} viewerId={profile?.id} />
          </section>
        </div>

        <aside className="space-y-6">
          {skills.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">{t("skills")}</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  {skills.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2">
                      <span className="font-medium">{s.skill_name}</span>
                      <span className="text-xs text-muted-foreground">{s.skill_level.toLowerCase()} · {t("yearsShort", { n: s.years_experience })}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {certs.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">{t("certifications")}</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  {certs.map((c) => (
                    <li key={c.id} className="flex items-start gap-2">
                      <Award className="mt-0.5 size-4 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="font-medium">{c.name} {c.verified && <BadgeCheck className="inline size-3.5 text-primary" aria-label={t("verified")} />}</p>
                        <p className="text-xs text-muted-foreground">{[c.issuing_organization, c.issue_date && f.date(c.issue_date, { month: "short", year: "numeric" })].filter(Boolean).join(" · ")}</p>
                        {c.certificate_url && (
                          <a href={c.certificate_url} target="_blank" rel="noopener noreferrer nofollow" className="text-xs text-primary hover:underline">{t("viewCertificate")}</a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {provider.latitude != null && provider.longitude != null && (
            <Card className="overflow-hidden py-0">
              <ServiceMap markers={[{ id: provider.id, lat: provider.latitude, lng: provider.longitude, title: provider.full_name ?? t("providerFallback"), subtitle: provider.location ?? undefined }]} height={220} zoom={12} />
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
