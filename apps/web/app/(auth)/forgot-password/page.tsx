import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/app/components/auth/ForgotPasswordForm";
import { getAuth } from "@/app/lib/guards";

export const metadata: Metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage() {
  const { user, profile } = await getAuth();
  if (user && profile?.is_active) redirect("/dashboard");

  return (
    <section className="glass-card rounded-2xl p-6 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">UCOMMERZ</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Reset your password</h1>
      <p className="mb-6 mt-2 text-sm text-muted-foreground">Enter your email and we&apos;ll send you a link to choose a new password.</p>
      <ForgotPasswordForm />
    </section>
  );
}
