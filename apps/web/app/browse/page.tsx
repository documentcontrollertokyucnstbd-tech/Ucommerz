import type { Metadata } from "next";
import { Search } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getCategories, searchServices, categoryName } from "@/app/lib/queries";
import { getAuth } from "@/app/lib/guards";
import { getFavoriteIds, safely } from "@/app/lib/queries-extra";
import { parseBrowseParams } from "@/app/lib/browse-params";
import { PAGE_SIZE, type Category } from "@ucommerz/shared";
import { BrowseFilters } from "@/app/components/BrowseFilters";
import { ServiceCard } from "@/app/components/ServiceCard";
import { Pagination } from "@/app/components/Pagination";
import { EmptyState } from "@/app/components/EmptyState";
import { PageHeader } from "@/app/components/PageHeader";
import { ServiceMap } from "@/app/components/Map";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");
  return { title: t("browseTitle"), description: t("browseDesc"), alternates: { canonical: "/browse" } };
}

type SP = Record<string, string | string[] | undefined>;

export default async function BrowsePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const t = await getTranslations("Browse");
  const { filters, values } = parseBrowseParams(sp);
  const { supabase, user } = await getAuth();

  let loadError: string | null = null;
  const [categories, result, favorites] = await Promise.all([
    safely(getCategories, [] as Category[]),
    searchServices(filters).catch((e: unknown) => {
      loadError = e instanceof Error ? e.message : "Could not load services.";
      console.error("[browse] searchServices failed", e);
      return { services: [], total: 0, page: 1, pageSize: PAGE_SIZE };
    }),
    safely(() => getFavoriteIds(supabase, user?.id), new Set<string>()),
  ]);

  const markers = result.services
    .filter((s) => s.latitude != null && s.longitude != null)
    .map((s) => ({ id: s.id, lat: s.latitude as number, lng: s.longitude as number, title: s.title, subtitle: s.location ?? undefined, href: `/services/${s.id}` }));

  const paramsForPager: Record<string, string | undefined> = { ...values };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        title={filters.category ? categoryName(categories, filters.category) : t("title")}
        description={`${t("found", { count: result.total })}${filters.lat != null ? ` ${t("nearYou")}` : ""}`}
      />
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <BrowseFilters categories={categories} values={values} />
        </aside>
        <section className="min-w-0">
          {markers.length > 0 && filters.lat != null && (
            <div className="mb-6 overflow-hidden rounded-xl border">
              <ServiceMap markers={markers} height={260} zoom={11} />
            </div>
          )}
          {loadError && (
            <div role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {t("loadError", { message: loadError })}
            </div>
          )}
          {result.services.length === 0 ? (
            <EmptyState
              icon={<Search className="size-5" />}
              title={t("emptyTitle")}
              description={t("emptyBody")}
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {result.services.map((s) => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  categoryLabel={categoryName(categories, s.category)}
                  showFavorite={Boolean(user)}
                  favorite={favorites.has(s.id)}
                />
              ))}
            </div>
          )}
          <Pagination page={result.page} total={result.total} pageSize={result.pageSize} basePath="/browse" params={paramsForPager} />
        </section>
      </div>
    </div>
  );
}
