import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, CalendarDays, CheckCircle2, LockKeyhole, Search, ShieldCheck, Star, Users } from "lucide-react";
import type { CategoryNode, ServiceWithProvider, UserProfile } from "@ucommerz/shared";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { ReviewStars } from "@/app/components/ReviewStars";
import { ServiceCard } from "@/app/components/ServiceCard";
import { Map as MapView, type MapMarker } from "@/app/components/Map";
import { FadeIn, Stagger, StaggerItem } from "@/app/components/motion";
import { CategoryIcon } from "@/app/lib/category-icons";
import { avatarOf } from "@/app/lib/media";

export async function HomeSections({
  categories,
  services,
  providers,
  counts,
  favoriteIds,
  signedIn,
}: {
  categories: CategoryNode[];
  services: ServiceWithProvider[];
  providers: UserProfile[];
  counts: { services: number; providers: number };
  favoriteIds: string[];
  signedIn: boolean;
}) {
  const t = await getTranslations("Home");
  const markers: MapMarker[] = services
    .filter((s) => s.latitude != null && s.longitude != null)
    .map((s) => ({
      id: s.id,
      lat: Number(s.latitude),
      lng: Number(s.longitude),
      title: s.title,
      subtitle: s.location ?? undefined,
      href: `/services/${s.id}`,
    }));
  const fav = new Set(favoriteIds);

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-[#111936] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_10%,rgba(99,102,241,.33),transparent_35%),linear-gradient(135deg,#1e1b4b_0%,#111936_70%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:px-8 lg:py-28">
          <FadeIn>
            <Badge className="border-indigo-400/30 bg-indigo-400/10 text-indigo-200">{t("badge")}</Badge>
            <h1 className="mt-6 max-w-3xl font-display text-5xl font-extrabold tracking-tight sm:text-6xl">
              {t("heroTitle1")}{" "}
              <span className="bg-gradient-to-r from-indigo-300 via-sky-300 to-cyan-200 bg-clip-text text-transparent">{t("heroTitle2")}</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300">
              {t("heroBody")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-indigo-500 text-white hover:bg-indigo-400">
                <Link href="/browse">
                  <Search /> {t("explore")} <ArrowRight className="rtl-flip" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-slate-600 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                <Link href="/register">{t("becomeProvider")}</Link>
              </Button>
            </div>
            <div className="mt-10 grid max-w-xl grid-cols-1 gap-3 border-t border-white/10 pt-5 text-xs text-slate-300 sm:grid-cols-3">
              <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-cyan-300" />{t("verified")}</span>
              <span className="flex items-center gap-2"><LockKeyhole className="size-4 text-cyan-300" />{t("secure")}</span>
              <span className="flex items-center gap-2"><Star className="size-4 text-amber-300" />{t("reviews")}</span>
            </div>
          </FadeIn>

          <FadeIn delay={0.15} className="hidden lg:block">
            <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur">
              <div className="rounded-xl bg-slate-950/60 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{t("findPro")}</span>
                  <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-xs text-emerald-300">{t("live")}</span>
                </div>
                <div className="mt-5 grid gap-3">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-slate-400">{t("popularNow")}</p>
                    <p className="mt-1 font-medium">
                      {categories.slice(0, 3).map((c) => c.name).join(", ") || t("popularFallback")}
                    </p>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-indigo-400/30 bg-indigo-500/10 p-4">
                    <div>
                      <p className="text-xs text-slate-400">{t("statsLabel")}</p>
                      <p className="mt-1 text-2xl font-bold">
                        {counts.services} · {counts.providers}
                      </p>
                    </div>
                    <Users className="size-8 text-indigo-300" />
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CATEGORY CHIPS */}
      {categories.length > 0 && (
        <section className="border-b border-border bg-background">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <span className="shrink-0 text-xs font-semibold text-foreground">{t("featuredCategories")}</span>
            <div className="marquee min-w-0 flex-1 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
              <div className="marquee-track text-xs">
                {[0, 1].map((copy) => (
                  <div key={copy} className="flex shrink-0 items-center gap-3 pe-3" aria-hidden={copy === 1 ? true : undefined}>
                    {categories.slice(0, 8).map((c) => (
                      <Link
                        key={c.id}
                        href={`/categories/${c.slug}`}
                        tabIndex={copy === 1 ? -1 : undefined}
                        className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-border px-4 py-2 text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                      >
                        <CategoryIcon name={c.icon} className="size-3.5" />
                        {c.name}
                        <span className="text-[10px]">{c.service_count}</span>
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <FadeIn className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">{t("browseByExpertise")}</p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">{t("categoriesTitle")}</h2>
          </div>
          <Link href="/categories" className="hidden items-center gap-1 text-sm font-semibold text-primary sm:flex">
            {t("viewAll")} <ArrowRight className="size-4 rtl-flip" />
          </Link>
        </FadeIn>
        <Stagger className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.slice(0, 8).map((c) => (
            <StaggerItem key={c.id}>
              <Link
                href={`/categories/${c.slug}`}
                className="group block h-full rounded-xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CategoryIcon name={c.icon} className="size-5" />
                  </div>
                  <span className="text-[11px] text-muted-foreground">{t("serviceCount", { count: c.service_count })}</span>
                </div>
                <h3 className="mt-5 font-semibold">{c.name}</h3>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                  {c.children.slice(0, 2).map((s) => s.name).join(" · ") || t("browseLocal")}
                </p>
                <span className="mt-6 flex items-center text-xs font-medium text-muted-foreground group-hover:text-primary">
                  {t("browseCategory")} <ArrowRight className="ms-auto size-3.5 rtl-flip" />
                </span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* FEATURED SERVICES */}
      <section className="bg-muted/40 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">{t("topRated")}</p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">{t("featuredTitle")}</h2>
            </div>
            <Link href="/browse" className="hidden items-center gap-1 text-sm font-semibold text-primary sm:flex">
              {t("exploreAll")} <ArrowRight className="size-4 rtl-flip" />
            </Link>
          </FadeIn>
          {services.length === 0 ? (
            <p className="mt-7 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              {t.rich("noServices", {
                link: (chunks) => (
                  <Link href="/register" className="font-medium text-primary hover:underline">{chunks}</Link>
                ),
              })}
            </p>
          ) : (
            <Stagger className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {services.slice(0, 4).map((s) => (
                <StaggerItem key={s.id}>
                  <ServiceCard service={s} showFavorite favorite={signedIn ? fav.has(s.id) : false} />
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </div>
      </section>

      {/* MAP */}
      {markers.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <FadeIn className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">{t("coverage")}</p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">{t("nearbyTitle")}</h2>
            </div>
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <Link href="/browse">
                {t("searchNearMe")} <ArrowRight className="rtl-flip" />
              </Link>
            </Button>
          </FadeIn>
          <FadeIn className="mt-7">
            <MapView markers={markers} height={360} zoom={9} />
          </FadeIn>
        </section>
      )}

      {/* PROVIDERS */}
      {providers.length > 0 && (
        <section className="bg-background pb-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeIn className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">{t("verifiedTalent")}</p>
                <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">{t("topPros")}</h2>
              </div>
              <Link href="/browse" className="text-sm font-semibold text-primary">
                {t("viewAll")} <ArrowRight className="ms-1 inline size-4 rtl-flip" />
              </Link>
            </FadeIn>
            <Stagger className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {providers.slice(0, 4).map((p) => (
                <StaggerItem key={p.id}>
                  <Link
                    href={`/provider/${p.slug ?? p.id}`}
                    className="block rounded-xl border border-border bg-card p-5 text-center transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <img src={avatarOf(p.avatar_url)} alt={p.full_name ?? t("providerFallback")} className="mx-auto size-20 rounded-full object-cover" />
                    <h3 className="mt-4 flex items-center justify-center gap-1 font-semibold">
                      {p.full_name}
                      {p.verified && <CheckCircle2 className="size-4 text-sky-500" aria-label={t("verifiedLabel")} />}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.bio ?? p.location ?? t("proFallback")}</p>
                    <div className="mt-3 flex items-center justify-center">
                      <ReviewStars rating={p.rating} count={p.total_reviews} />
                    </div>
                    <span className="mt-4 block rounded-md bg-muted py-2 text-xs font-semibold">{t("viewProfile")}</span>
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      )}

      {/* HOW IT WORKS */}
      <section className="border-y border-border bg-muted/40 py-14">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <Badge variant="outline" className="border-primary/30 text-primary">{t("howBadge")}</Badge>
          <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">{t("howTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("howSub")}</p>
          <Stagger className="mt-8 grid gap-4 text-left md:grid-cols-3">
            {[
              { n: "01", icon: Search, title: t("step1Title"), body: t("step1Body") },
              { n: "02", icon: CalendarDays, title: t("step2Title"), body: t("step2Body") },
              { n: "03", icon: CheckCircle2, title: t("step3Title"), body: t("step3Body") },
            ].map((x) => (
              <StaggerItem key={x.n}>
                <div className="h-full rounded-xl border border-border bg-card p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex size-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">{x.n}</span>
                    <x.icon className="size-5 text-primary" />
                  </div>
                  <h3 className="mt-6 font-semibold">{x.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{x.body}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="rounded-2xl bg-gradient-to-r from-indigo-950 to-[#1d2450] px-6 py-10 text-white sm:flex sm:items-center sm:justify-between sm:px-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-indigo-300">{t("growKicker")}</p>
              <h2 className="mt-2 font-display text-2xl font-bold">{t("ctaTitle")}</h2>
              <p className="mt-2 text-sm text-slate-300">{t("ctaBody")}</p>
            </div>
            <div className="mt-6 flex gap-2 sm:mt-0">
              <Button asChild className="bg-indigo-500 text-white hover:bg-indigo-400">
                <Link href="/register">{t("startFree")}</Link>
              </Button>
            </div>
          </div>
        </FadeIn>
      </section>
    </>
  );
}
