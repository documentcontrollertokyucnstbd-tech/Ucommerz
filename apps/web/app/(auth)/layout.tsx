import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const t = useTranslations("Auth");
  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_45%),radial-gradient(circle_at_90%_90%,color-mix(in_oklch,var(--brand-accent)_16%,transparent),transparent_40%)]" />
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
        <aside className="hidden lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">UCOMMERZ</p>
          <h2 className="mt-3 font-display text-4xl font-extrabold leading-tight tracking-tight">
            {t("headline1")} <span className="bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 bg-clip-text text-transparent">{t("headline2")}</span>
          </h2>
          <ul className="mt-8 space-y-4 text-sm text-muted-foreground">
            {[
              { icon: ShieldCheck, text: t("point1") },
              { icon: CheckCircle2, text: t("point2") },
              { icon: Sparkles, text: t("point3") },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <p className="mt-10 text-xs text-muted-foreground">
            {t.rich("help", {
              link: (chunks) => <Link href="/browse" className="font-medium text-primary hover:underline">{chunks}</Link>,
            })}
          </p>
        </aside>
        <div className="mx-auto w-full max-w-md">{children}</div>
      </div>
    </main>
  );
}
