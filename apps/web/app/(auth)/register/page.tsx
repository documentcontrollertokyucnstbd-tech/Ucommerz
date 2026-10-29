import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RegisterForm } from "@/app/components/auth/RegisterForm";
import { getAuth } from "@/app/lib/guards";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");
  return { title: t("registerTitle"), description: t("registerDesc") };
}

export default async function RegisterPage() {
  const t = await getTranslations("Register");
  const { user, profile } = await getAuth();
  if (user && profile?.is_active) redirect("/dashboard");

  return (
    <section className="glass-card rounded-2xl p-6 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">UCOMMERZ</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mb-6 mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
      <RegisterForm />
    </section>
  );
}
