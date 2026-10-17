import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/app/components/auth/RegisterForm";
import { getAuth } from "@/app/lib/guards";

export const metadata: Metadata = { title: "Create your account", description: "Join UCOMMERZ as a customer or a service provider." };

export default async function RegisterPage() {
  const { user, profile } = await getAuth();
  if (user && profile?.is_active) redirect("/dashboard");

  return (
    <section className="glass-card rounded-2xl p-6 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">UCOMMERZ</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Create your account</h1>
      <p className="mb-6 mt-2 text-sm text-muted-foreground">Hire trusted experts or start offering your own services.</p>
      <RegisterForm />
    </section>
  );
}
