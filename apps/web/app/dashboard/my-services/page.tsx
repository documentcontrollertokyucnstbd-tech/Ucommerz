import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Wrench } from "lucide-react";
import type { Service } from "@ucommerz/shared";
import { requireProvider } from "@/app/lib/guards";
import { getCategories, categoryName } from "@/app/lib/queries";
import { safely } from "@/app/lib/queries-extra";
import { formatCurrency } from "@/app/lib/utils";
import { serviceImage } from "@/app/lib/media";
import { PageHeader } from "@/app/components/PageHeader";
import { EmptyState } from "@/app/components/EmptyState";
import { StatusBadge } from "@/app/components/StatusBadge";
import { ServiceRowActions } from "@/app/components/ServiceRowActions";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";

export const metadata: Metadata = { title: "My services" };

export default async function MyServicesPage() {
  const { profile, supabase } = await requireProvider("/dashboard/my-services");
  const [categories, { data }] = await Promise.all([
    safely(getCategories, []),
    supabase.from("services").select("*").eq("provider_id", profile.id).order("created_at", { ascending: false }),
  ]);
  const services = (data as Service[] | null) ?? [];

  return (
    <div>
      <PageHeader title="My services" description="Create and manage what you offer." actions={<Button asChild><Link href="/dashboard/my-services/create"><Plus /> New service</Link></Button>} />
      {services.length === 0 ? (
        <EmptyState icon={<Wrench className="size-5" />} title="No services yet" description="Publish your first service to start receiving bookings." action={<Button asChild><Link href="/dashboard/my-services/create">Create a service</Link></Button>} />
      ) : (
        <div className="grid gap-3">
          {services.map((s) => (
            <Card key={s.id} className="flex-row items-center gap-4 p-3">
              <img src={serviceImage(s)} alt="" className="size-20 shrink-0 rounded-lg object-cover" loading="lazy" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-semibold">{s.title}</h3>
                  <StatusBadge status={s.status} />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {categoryName(categories, s.category)} · {formatCurrency(s.price)}/{s.price_unit} · {s.views} views · ★ {Number(s.rating).toFixed(1)} ({s.total_reviews})
                </p>
                {s.status === "PENDING" && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Awaiting admin approval</p>}
                {s.status === "REJECTED" && <p className="mt-1 text-xs text-destructive">Rejected — edit and resubmit</p>}
              </div>
              <ServiceRowActions id={s.id} status={s.status} title={s.title} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
