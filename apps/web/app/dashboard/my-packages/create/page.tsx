import type { Metadata } from "next";
import type { Service } from "@ucommerz/shared";
import { requireProvider } from "@/app/lib/guards";
import { PageHeader } from "@/app/components/PageHeader";
import { PackageForm } from "@/app/components/PackageForm";

export const metadata: Metadata = { title: "New package" };

export default async function CreatePackagePage() {
  const { profile, supabase } = await requireProvider("/dashboard/my-packages/create");
  const { data } = await supabase.from("services").select("id, title, price, price_unit").eq("provider_id", profile.id).eq("status", "ACTIVE").order("title");
  return (
    <div className="max-w-2xl">
      <PageHeader title="Create a package" description="Bundle two or more of your active services." />
      <PackageForm services={(data as Pick<Service, "id" | "title" | "price" | "price_unit">[] | null) ?? []} />
    </div>
  );
}
