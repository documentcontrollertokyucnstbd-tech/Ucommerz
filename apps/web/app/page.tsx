import type { Metadata } from "next";
import { HomeSections } from "@/app/components/HomeSections";
import { getAuth } from "@/app/lib/guards";
import { getCategoryTree, getFeaturedProviders, getFeaturedServices } from "@/app/lib/queries";
import { getFavoriteIds, getPlatformCounts, safely } from "@/app/lib/queries-extra";

export const metadata: Metadata = {
  title: { absolute: "UCOMMERZ — Book Trusted Experts for Every Service" },
  description:
    "Find and book verified local professionals: home services, web development, photography, cleaning, consulting and more.",
  alternates: { canonical: "/" },
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categories, services, providers, counts, auth] = await Promise.all([
    safely(() => getCategoryTree(), []),
    safely(() => getFeaturedServices(4), []),
    safely(() => getFeaturedProviders(4), []),
    safely(() => getPlatformCounts(), { services: 0, providers: 0 }),
    safely(() => getAuth(), null),
  ]);

  const favoriteIds =
    auth?.profile ? Array.from(await safely(() => getFavoriteIds(auth.supabase, auth.profile!.id), new Set<string>())) : [];

  return (
    <main>
      <HomeSections
        categories={categories}
        services={services}
        providers={providers}
        counts={counts}
        favoriteIds={favoriteIds}
        signedIn={Boolean(auth?.profile)}
      />
    </main>
  );
}
