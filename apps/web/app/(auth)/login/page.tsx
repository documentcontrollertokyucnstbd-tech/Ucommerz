import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { LoginForm } from "@/app/components/auth/LoginForm";
import { getAuth } from "@/app/lib/guards";
import { safeNext } from "@/app/lib/safe-next";
import { first } from "@/app/lib/utils";

export const metadata: Metadata = { title: "Sign in", description: "Sign in to manage your bookings and messages on UCOMMERZ." };

const ERRORS: Record<string, "suspended" | "profileMissing" | "authCallback"> = {
  suspended: "suspended",
  "profile-missing": "profileMissing",
  "auth-callback": "authCallback",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const t = await getTranslations("Login");
  const next = safeNext(first(sp.next), "");
  const errorKey = first(sp.error);
  const { user, profile } = await getAuth();
  if (user && profile?.is_active) redirect(next || "/dashboard");

  return (
    <section className="glass-card rounded-2xl p-6 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">UCOMMERZ</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mb-6 mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
      {errorKey && ERRORS[errorKey] && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle />
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{t(ERRORS[errorKey])}</AlertDescription>
        </Alert>
      )}
      <LoginForm next={next || undefined} />
    </section>
  );
}
