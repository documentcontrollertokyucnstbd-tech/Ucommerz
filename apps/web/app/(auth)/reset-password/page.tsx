import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/app/components/ui/button";
import { ResetPasswordForm } from "@/app/components/auth/ResetPasswordForm";
import { getAuth } from "@/app/lib/guards";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage() {
  const t = await getTranslations("Reset");
  const { user } = await getAuth();

  return (
    <section className="glass-card rounded-2xl p-6 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">UCOMMERZ</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">{t("title")}</h1>
      {user ? (
        <>
          <p className="mb-6 mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
          <ResetPasswordForm />
        </>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">{t("invalid")}</p>
          <Button asChild className="w-full">
            <Link href="/forgot-password">{t("request")}</Link>
          </Button>
        </div>
      )}
    </section>
  );
}
