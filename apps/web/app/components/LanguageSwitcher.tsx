"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, Languages } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import { LOCALES, LOCALE_COOKIE, LOCALE_META, isLocale } from "@/app/i18n/config";

/** Saves the chosen language in a cookie (1 year) and re-renders the page in that language. */
export function LanguageSwitcher() {
  const router = useRouter();
  const current = useLocale();
  const t = useTranslations("Lang");

  function choose(code: string) {
    if (!isLocale(code) || code === current) return;
    document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 gap-1.5 px-2" aria-label={t("label")}>
          <Languages className="size-4" />
          <span className="hidden text-xs font-semibold uppercase sm:inline">{current}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {LOCALES.map((code) => (
          <DropdownMenuItem key={code} onSelect={() => choose(code)} lang={code} dir={LOCALE_META[code].dir}>
            {LOCALE_META[code].name}
            {code === current && <Check className="ms-auto size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
