import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/app/lib/guards";
import { PageHeader } from "@/app/components/PageHeader";
import { AvatarUpload } from "@/app/components/AvatarUpload";
import { ProfileForm } from "@/app/components/ProfileForm";
import { EnableRoleButton } from "@/app/components/EnableRoleButton";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";

export const metadata: Metadata = { title: "My profile", robots: { index: false } };

export default async function ProfilePage() {
  const { profile } = await requireUser("/profile");
  const roleLabel = { PROVIDER: "Provider", SEEKER: "Customer", BOTH: "Customer & Provider", ADMIN: "Administrator", SUPERADMIN: "Super admin" }[profile.role];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader
        title="My profile"
        description={profile.email}
        actions={
          <>
            <Badge variant="secondary">{roleLabel}</Badge>
            {profile.slug && <Button asChild variant="outline" size="sm"><Link href={`/provider/${profile.slug}`}>View public profile</Link></Button>}
          </>
        }
      />
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Photo</CardTitle></CardHeader>
          <CardContent><AvatarUpload userId={profile.id} name={profile.full_name} url={profile.avatar_url} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Details</CardTitle><CardDescription>Keep your information up to date.</CardDescription></CardHeader>
          <CardContent><ProfileForm profile={profile} /></CardContent>
        </Card>
        {(profile.role === "SEEKER" || profile.role === "PROVIDER") && (
          <Card>
            <CardHeader>
              <CardTitle>Account type</CardTitle>
              <CardDescription>
                {profile.role === "SEEKER" ? "Want to offer your own services too? Enable provider tools — it's free." : "Want to book services from others? Enable customer features."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profile.role === "SEEKER" ? (
                <EnableRoleButton target="PROVIDER" label="Become a provider" />
              ) : (
                <EnableRoleButton target="SEEKER" label="Enable customer features" />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
