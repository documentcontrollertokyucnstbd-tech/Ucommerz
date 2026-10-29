import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Compass } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("PubErrors");
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"><Compass className="size-7" /></span>
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="mt-1 font-display text-3xl font-bold">{t("notFoundTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("notFoundBody")}</p>
      <div className="mt-6 flex gap-3">
        <Button asChild><Link href="/">{t("backHome")}</Link></Button>
        <Button asChild variant="outline"><Link href="/browse">{t("browseServices")}</Link></Button>
      </div>
    </div>
  );
}
