import type { Metadata } from "next";
import Link from "next/link";
import { Package, Plus } from "lucide-react";
import type { PackageWithServices } from "@ucommerz/shared";
import { requireProvider } from "@/app/lib/guards";
import { formatCurrency } from "@/app/lib/utils";
import { PageHeader } from "@/app/components/PageHeader";
import { EmptyState } from "@/app/components/EmptyState";
import { PackageRowActions } from "@/app/components/PackageRowActions";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";

export const metadata: Metadata = { title: "My packages" };

export default async function MyPackagesPage() {
  const { profile, supabase } = await requireProvider("/dashboard/my-packages");
  const { data } = await supabase
    .from("packages")
    .select("*, package_services(*, service:services(id, title, price, price_unit))")
    .eq("provider_id", profile.id)
    .order("created_at", { ascending: false });
  const packages = (data as PackageWithServices[] | null) ?? [];
  return (
    <div>
      <PageHeader title="My packages" description="Bundle services at a discount." actions={<Button asChild><Link href="/dashboard/my-packages/create"><Plus /> New package</Link></Button>} />
      {packages.length === 0 ? (
        <EmptyState icon={<Package className="size-5" />} title="No packages yet" description="Offer bundles to increase order value." action={<Button asChild><Link href="/dashboard/my-packages/create">Create a package</Link></Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {packages.map((p) => (
            <Card key={p.id}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div><p className="font-semibold">{p.title}</p><p className="text-lg font-bold text-primary">{formatCurrency(p.price)} {Number(p.discount_percentage) > 0 && <span className="text-xs font-normal text-muted-foreground">({Number(p.discount_percentage)}% off)</span>}</p></div>
                  <Badge variant={p.is_active ? "success" : "muted"}>{p.is_active ? "Active" : "Paused"}</Badge>
                </div>
                <ul className="text-sm text-muted-foreground">{p.package_services.map((ps) => <li key={ps.id}>• {ps.service?.title ?? "Service"}</li>)}</ul>
                <PackageRowActions id={p.id} active={p.is_active} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
