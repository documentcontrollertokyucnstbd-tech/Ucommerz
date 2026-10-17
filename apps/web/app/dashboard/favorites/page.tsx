import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";
import type { ServiceWithProvider } from "@ucommerz/shared";
import { requireSeeker } from "@/app/lib/guards";
import { SERVICE_WITH_PROVIDER, getCategories, categoryName } from "@/app/lib/queries";
import { safely } from "@/app/lib/queries-extra";
import { PageHeader } from "@/app/components/PageHeader";
import { EmptyState } from "@/app/components/EmptyState";
import { ServiceCard } from "@/app/components/ServiceCard";
import { Button } from "@/app/components/ui/button";

export const metadata: Metadata = { title: "Favorites" };

export default async function FavoritesPage() {
  const { profile, supabase } = await requireSeeker("/dashboard/favorites");
  const [categories, { data }] = await Promise.all([
    safely(getCategories, []),
    supabase.from("favorites").select(`id, service:services(${SERVICE_WITH_PROVIDER})`).eq("user_id", profile.id).order("created_at", { ascending: false }),
  ]);
  const services = ((data as unknown as { id: string; service: ServiceWithProvider | null }[] | null) ?? [])
    .map((f) => f.service)
    .filter((s): s is ServiceWithProvider => Boolean(s));

  return (
    <div>
      <PageHeader title="Favorites" description="Services you've saved for later." />
      {services.length === 0 ? (
        <EmptyState icon={<Heart className="size-5" />} title="No favorites yet" description="Tap the heart on any service to save it here." action={<Button asChild><Link href="/browse">Browse services</Link></Button>} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {services.map((s) => <ServiceCard key={s.id} service={s} categoryLabel={categoryName(categories, s.category)} showFavorite favorite />)}
        </div>
      )}
    </div>
  );
}
