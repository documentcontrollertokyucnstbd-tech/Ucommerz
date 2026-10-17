import type { Metadata } from "next";
import Link from "next/link";
import type { ProviderCertification, ProviderPortfolioItem, ProviderSkill } from "@ucommerz/shared";
import { requireProvider } from "@/app/lib/guards";
import { PageHeader } from "@/app/components/PageHeader";
import { ProviderProfileManager } from "@/app/components/ProviderProfileManager";
import { Button } from "@/app/components/ui/button";

export const metadata: Metadata = { title: "Provider profile" };

export default async function ProviderProfilePage() {
  const { profile, supabase } = await requireProvider("/dashboard/provider-profile");
  const [skills, certs, portfolio] = await Promise.all([
    supabase.from("provider_skills").select("*").eq("provider_id", profile.id).order("created_at"),
    supabase.from("provider_certifications").select("*").eq("provider_id", profile.id).order("created_at", { ascending: false }),
    supabase.from("provider_portfolio").select("*").eq("provider_id", profile.id).order("created_at", { ascending: false }),
  ]);
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Provider profile"
        description="Skills, certifications and portfolio shown on your public page."
        actions={
          <>
            <Button asChild variant="outline"><Link href="/profile">Edit basic info</Link></Button>
            {profile.slug && <Button asChild><Link href={`/provider/${profile.slug}`}>View public page</Link></Button>}
          </>
        }
      />
      <ProviderProfileManager userId={profile.id} skills={(skills.data as ProviderSkill[] | null) ?? []} certs={(certs.data as ProviderCertification[] | null) ?? []} portfolio={(portfolio.data as ProviderPortfolioItem[] | null) ?? []} />
    </div>
  );
}
