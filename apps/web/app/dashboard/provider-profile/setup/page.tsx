import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import type { ProviderCertification, ProviderPortfolioItem, ProviderSkill } from "@ucommerz/shared";
import { getTranslations } from "next-intl/server";
import { requireProvider } from "@/app/lib/guards";
import { PageHeader } from "@/app/components/PageHeader";
import { ProviderProfileManager } from "@/app/components/ProviderProfileManager";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("DashProviderPage");
  return { title: t("setupMeta") };
}

export default async function ProviderSetupPage() {
  const t = await getTranslations("DashProviderPage");
  const { profile, supabase } = await requireProvider("/dashboard/provider-profile/setup");
  const [skills, certs, portfolio, services] = await Promise.all([
    supabase.from("provider_skills").select("*").eq("provider_id", profile.id),
    supabase.from("provider_certifications").select("*").eq("provider_id", profile.id),
    supabase.from("provider_portfolio").select("*").eq("provider_id", profile.id),
    supabase.from("services").select("id", { count: "exact", head: true }).eq("provider_id", profile.id),
  ]);
  const steps = [
    { done: Boolean(profile.bio && profile.location), key: "bio", href: "/profile" },
    { done: (skills.data?.length ?? 0) > 0, key: "skills", href: "#" },
    { done: (services.count ?? 0) > 0, key: "service", href: "/dashboard/my-services/create" },
  ];
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={t("setupTitle")} description={t("setupDesc")} />
      <Card>
        <CardContent>
          <ul className="space-y-3">
            {steps.map((s) => (
              <li key={s.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">{s.done ? <CheckCircle2 className="size-5 text-emerald-500" /> : <Circle className="size-5 text-muted-foreground" />}{t(`steps.${s.key}`)}</span>
                {!s.done && s.href !== "#" && <Button asChild size="sm" variant="outline"><Link href={s.href}>{t("doIt")}</Link></Button>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <ProviderProfileManager userId={profile.id} skills={(skills.data as ProviderSkill[] | null) ?? []} certs={(certs.data as ProviderCertification[] | null) ?? []} portfolio={(portfolio.data as ProviderPortfolioItem[] | null) ?? []} />
    </div>
  );
}
