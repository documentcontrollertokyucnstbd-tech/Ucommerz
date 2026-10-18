import Link from "next/link";
import { useTranslations } from "next-intl";
import { Logo } from "@/app/components/Logo";

export function Footer() {
  const t = useTranslations("Footer");
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
            {t("tagline")}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">{t("marketplace")}</h3>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">{t("home")}</Link>
            <Link href="/browse" className="hover:text-foreground">{t("browse")}</Link>
            <Link href="/categories" className="hover:text-foreground">{t("allCategories")}</Link>
            <Link href="/register" className="hover:text-foreground">{t("becomeProvider")}</Link>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold">{t("popular")}</h3>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <Link href="/categories/web-software" className="hover:text-foreground">{t("webSoftware")}</Link>
            <Link href="/categories/home-services" className="hover:text-foreground">{t("homeServices")}</Link>
            <Link href="/categories/photography" className="hover:text-foreground">{t("photography")}</Link>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold">{t("forPros")}</h3>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <Link href="/register" className="hover:text-foreground">{t("join")}</Link>
            <Link href="/dashboard/provider-dashboard" className="hover:text-foreground">{t("portal")}</Link>
            <Link href="/login" className="hover:text-foreground">{t("signIn")}</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>{t("rights", { year: new Date().getFullYear() })}</span>
          <span>{t("legal")}</span>
        </div>
      </div>
    </footer>
  );
}
