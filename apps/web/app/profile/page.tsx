import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/app/lib/guards";
import { PageHeader } from "@/app/components/PageHeader";
import { AvatarUpload } from "@/app/components/AvatarUpload";
import { ProfileForm } from "@/app/components/ProfileForm";
import { EnableRoleButton } from "@/app/components/EnableRoleButton";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PubProfile");
  return { title: t("title"), robots: { index: false } };
}

export default async function ProfilePage() {
  const { profile } = await requireUser("/profile");
  const t = await getTranslations("PubProfile");
  const tRole = await getTranslations("Role");
  const roleLabel = tRole(profile.role);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader
        title={t("title")}
        description={profile.email}
        actions={
          <>
            <Badge variant="secondary">{roleLabel}</Badge>
            {profile.slug && <Button asChild variant="outline" size="sm"><Link href={`/provider/${profile.slug}`}>{t("viewPublic")}</Link></Button>}
          </>
        }
      />
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>{t("photo")}</CardTitle></CardHeader>
          <CardContent><AvatarUpload userId={profile.id} name={profile.full_name} url={profile.avatar_url} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("details")}</CardTitle><CardDescription>{t("detailsDesc")}</CardDescription></CardHeader>
          <CardContent><ProfileForm profile={profile} /></CardContent>
        </Card>
        {(profile.role === "SEEKER" || profile.role === "PROVIDER") && (
          <Card>
            <CardHeader>
              <CardTitle>{t("accountType")}</CardTitle>
              <CardDescription>
                {profile.role === "SEEKER" ? t("seekerPrompt") : t("providerPrompt")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profile.role === "SEEKER" ? (
                <EnableRoleButton target="PROVIDER" label={t("becomeProvider")} />
              ) : (
                <EnableRoleButton target="SEEKER" label={t("enableCustomer")} />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
