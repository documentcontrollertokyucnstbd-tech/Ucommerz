import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { isStaffRole } from "@ucommerz/shared";
import { requireUser } from "@/app/lib/guards";
import { DashboardNav } from "@/app/components/DashboardNav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("DashShell");
  return { title: { default: t("metaTitle"), template: t("metaTemplate") }, robots: { index: false, follow: false } };
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireUser("/dashboard");
  if (isStaffRole(profile.role)) redirect("/admin"); // staff manage the site; they view user dashboards from /admin/users
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-6 lg:flex-row">
        <DashboardNav role={profile.role} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
