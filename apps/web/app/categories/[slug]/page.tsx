import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Search } from "lucide-react";
import { PAGE_SIZE } from "@ucommerz/shared";
import { getAuth } from "@/app/lib/guards";
import { getCategories, getCategoryBySlug, searchServices, categoryName } from "@/app/lib/queries";
import { getFavoriteIds, safely } from "@/app/lib/queries-extra";
import { parseBrowseParams, type SearchParamsRecord } from "@/app/lib/browse-params";
import { BrowseFilters } from "@/app/components/BrowseFilters";
import { ServiceCard } from "@/app/components/ServiceCard";
import { Pagination } from "@/app/components/Pagination";
import { EmptyState } from "@/app/components/EmptyState";
import { PageHeader } from "@/app/components/PageHeader";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParamsRecord> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTranslations("Meta");
  const category = await safely(() => getCategoryBySlug(slug), null);
  if (!category) return { title: t("categoryNotFound") };
  return {
    title: category.name,
    description: category.description ?? t("categoryDesc", { name: category.name }),
    alternates: { canonical: `/categories/${category.slug}` },
  };
}

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const t = await getTranslations("Categories");
  const th = await getTranslations("Home");
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const categories = await safely(getCategories, []);
  const parent = category.parent_id ? categories.find((c) => c.id === category.parent_id) : null;
  const subs = categories.filter((c) => c.parent_id === category.id);

  const { filters, values } = parseBrowseParams(sp);
  filters.category = parent ? parent.slug : category.slug;
  filters.subCategory = parent ? category.slug : undefined;

  const { supabase, user } = await getAuth();
  const [result, favorites] = await Promise.all([
    safely(() => searchServices(filters), { services: [], total: 0, page: 1, pageSize: PAGE_SIZE }),
    safely(() => getFavoriteIds(supabase, user?.id), new Set<string>()),
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <nav className="mb-3 text-sm text-muted-foreground" aria-label={t("breadcrumb")}>
        <Link href="/categories" className="hover:text-foreground">{t("title")}</Link>
        {parent && (<> {" / "}<Link href={`/categories/${parent.slug}`} className="hover:text-foreground">{parent.name}</Link></>)}
      </nav>
      <PageHeader title={category.name} description={category.description ?? th("serviceCount", { count: result.total })} />
      {subs.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {subs.map((s) => (
            <Link key={s.id} href={`/categories/${s.slug}`} className="rounded-full border px-3 py-1 text-sm text-muted-foreground transition hover:border-primary hover:text-primary">
              {s.name}
            </Link>
          ))}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <BrowseFilters categories={categories} values={values} basePath={`/categories/${category.slug}`} lockCategory />
        </aside>
        <section className="min-w-0">
          {result.services.length === 0 ? (
            <EmptyState icon={<Search className="size-5" />} title={t("emptyCategoryTitle")} description={t("emptyCategoryBody")} />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {result.services.map((s) => (
                <ServiceCard key={s.id} service={s} categoryLabel={categoryName(categories, s.category)} showFavorite={Boolean(user)} favorite={favorites.has(s.id)} />
              ))}
            </div>
          )}
          <Pagination page={result.page} total={result.total} pageSize={result.pageSize} basePath={`/categories/${category.slug}`} params={{ ...values, category: undefined }} />
        </section>
      </div>
    </div>
  );
}
