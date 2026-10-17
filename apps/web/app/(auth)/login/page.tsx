import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { LoginForm } from "@/app/components/auth/LoginForm";
import { getAuth } from "@/app/lib/guards";
import { safeNext } from "@/app/lib/safe-next";
import { first } from "@/app/lib/utils";

export const metadata: Metadata = { title: "Sign in", description: "Sign in to manage your bookings and messages on UCOMMERZ." };

const ERRORS: Record<string, string> = {
  suspended: "This account has been suspended. Contact support for help.",
  "profile-missing": "We couldn't load your profile. Please sign in again.",
  "auth-callback": "That confirmation link is invalid or has expired. Please sign in or request a new one.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(first(sp.next), "");
  const errorKey = first(sp.error);
  const { user, profile } = await getAuth();
  if (user && profile?.is_active) redirect(next || "/dashboard");

  return (
    <section className="glass-card rounded-2xl p-6 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">UCOMMERZ</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Welcome back</h1>
      <p className="mb-6 mt-2 text-sm text-muted-foreground">Sign in to manage bookings and discover trusted professionals.</p>
      {errorKey && ERRORS[errorKey] && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle />
          <AlertTitle>Couldn&apos;t sign you in</AlertTitle>
          <AlertDescription>{ERRORS[errorKey]}</AlertDescription>
        </Alert>
      )}
      <LoginForm next={next || undefined} />
    </section>
  );
}
