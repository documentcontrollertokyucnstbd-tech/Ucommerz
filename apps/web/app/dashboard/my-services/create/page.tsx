import type { Metadata } from "next";
import { requireProvider } from "@/app/lib/guards";
import { getCategories } from "@/app/lib/queries";
import { safely } from "@/app/lib/queries-extra";
import { PageHeader } from "@/app/components/PageHeader";
import { ServiceForm } from "@/app/components/ServiceForm";

export const metadata: Metadata = { title: "New service" };

export default async function CreateServicePage() {
  const { profile } = await requireProvider("/dashboard/my-services/create");
  const categories = await safely(getCategories, []);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Create a service" description="Describe what you offer. New services are reviewed before going live." />
      <ServiceForm categories={categories} userId={profile.id} />
    </div>
  );
}
