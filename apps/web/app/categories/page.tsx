import type { Metadata } from "next";
import Link from "next/link";
import { getCategoryTree } from "@/app/lib/queries";
import { getCurrentProfile } from "@/app/lib/guards";
import { Button } from "@/app/components/ui/button";
import { safely } from "@/app/lib/queries-extra";
import { CategoryIcon } from "@/app/lib/category-icons";
import { PageHeader } from "@/app/components/PageHeader";
import { EmptyState } from "@/app/components/EmptyState";
import { Stagger, StaggerItem } from "@/app/components/motion";
import type { CategoryNode } from "@ucommerz/shared";
import { LayoutGrid } from "lucide-react";

export const metadata: Metadata = {
  title: "Categories",
  description: "Explore every service category on UCOMMERZ.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const tree = await safely(getCategoryTree, [] as CategoryNode[]);
  const me = await safely(getCurrentProfile, null);
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Categories"
        description="Find the right expert for any job."
        actions={me?.role === "SUPERADMIN" ? <Button asChild size="sm"><Link href="/admin/categories">Add / manage categories</Link></Button> : undefined}
      />
      {tree.length === 0 ? (
        <EmptyState icon={<LayoutGrid className="size-5" />} title="No categories yet" description="Categories will appear here once they are created." />
      ) : (
        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tree.map((c) => (
            <StaggerItem key={c.id}>
              <div className="glass-card h-full rounded-xl border p-5 transition hover:shadow-lg">
                <Link href={`/categories/${c.slug}`} className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CategoryIcon name={c.icon} className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{c.service_count} {c.service_count === 1 ? "service" : "services"}</span>
                  </span>
                </Link>
                {c.description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
                {c.children.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {c.children.slice(0, 8).map((s) => (
                      <li key={s.id}>
                        <Link href={`/categories/${s.slug}`} className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-primary">
                          {s.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
