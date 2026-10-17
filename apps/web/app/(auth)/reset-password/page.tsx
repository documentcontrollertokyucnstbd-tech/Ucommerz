import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { ResetPasswordForm } from "@/app/components/auth/ResetPasswordForm";
import { getAuth } from "@/app/lib/guards";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage() {
  const { user } = await getAuth();

  return (
    <section className="glass-card rounded-2xl p-6 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">UCOMMERZ</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Choose a new password</h1>
      {user ? (
        <>
          <p className="mb-6 mt-2 text-sm text-muted-foreground">Pick a strong password you haven&apos;t used elsewhere.</p>
          <ResetPasswordForm />
        </>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">This reset link is invalid or has expired. Request a new one to continue.</p>
          <Button asChild className="w-full">
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      )}
    </section>
  );
}
