import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/app/components/ui/button";

export default function DashboardNotFound() {
  const t = useTranslations("DashShell");
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
      <h1 className="font-display text-2xl font-bold">{t("notFoundTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("notFoundDesc")}</p>
      <Button asChild className="mt-5"><Link href="/dashboard">{t("backToDashboard")}</Link></Button>
    </div>
  );
}
