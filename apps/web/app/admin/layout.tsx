import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireAdmin } from "@/app/lib/guards";
import { AdminNav } from "@/app/components/AdminNav";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { supabase, profile } = await requireAdmin();
  const [reports, services] = await Promise.all([
    supabase.from("reports").select("id", { count: "exact", head: true }).in("status", ["PENDING", "UNDER_REVIEW"]),
    supabase.from("services").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
  ]);
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-6 lg:flex-row">
        <AdminNav role={profile.role} pendingReports={reports.count ?? 0} pendingServices={services.count ?? 0} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
