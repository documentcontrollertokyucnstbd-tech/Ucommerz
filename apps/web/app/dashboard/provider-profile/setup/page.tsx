import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import type { ProviderCertification, ProviderPortfolioItem, ProviderSkill } from "@ucommerz/shared";
import { requireProvider } from "@/app/lib/guards";
import { PageHeader } from "@/app/components/PageHeader";
import { ProviderProfileManager } from "@/app/components/ProviderProfileManager";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";

export const metadata: Metadata = { title: "Set up your provider profile" };

export default async function ProviderSetupPage() {
  const { profile, supabase } = await requireProvider("/dashboard/provider-profile/setup");
  const [skills, certs, portfolio, services] = await Promise.all([
    supabase.from("provider_skills").select("*").eq("provider_id", profile.id),
    supabase.from("provider_certifications").select("*").eq("provider_id", profile.id),
    supabase.from("provider_portfolio").select("*").eq("provider_id", profile.id),
    supabase.from("services").select("id", { count: "exact", head: true }).eq("provider_id", profile.id),
  ]);
  const steps = [
    { done: Boolean(profile.bio && profile.location), label: "Add a bio and location", href: "/profile" },
    { done: (skills.data?.length ?? 0) > 0, label: "List your skills", href: "#" },
    { done: (services.count ?? 0) > 0, label: "Publish your first service", href: "/dashboard/my-services/create" },
  ];
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Welcome, provider!" description="Complete these steps to start getting bookings." />
      <Card>
        <CardContent>
          <ul className="space-y-3">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">{s.done ? <CheckCircle2 className="size-5 text-emerald-500" /> : <Circle className="size-5 text-muted-foreground" />}{s.label}</span>
                {!s.done && s.href !== "#" && <Button asChild size="sm" variant="outline"><Link href={s.href}>Do it</Link></Button>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <ProviderProfileManager userId={profile.id} skills={(skills.data as ProviderSkill[] | null) ?? []} certs={(certs.data as ProviderCertification[] | null) ?? []} portfolio={(portfolio.data as ProviderPortfolioItem[] | null) ?? []} />
    </div>
  );
}
