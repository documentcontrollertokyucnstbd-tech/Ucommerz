import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/app/components/ui/button";

/** Server-rendered pagination driven by a `page` search param, preserving other params. */
export function Pagination({
  page,
  total,
  pageSize,
  basePath,
  params = {},
}: {
  page: number;
  total: number;
  pageSize: number;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  const t = useTranslations("Pagination");
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const q = sp.toString();
    return `${basePath}${q ? `?${q}` : ""}`;
  };

  return (
    <nav className="mt-8 flex items-center justify-center gap-3" aria-label={t("label")}>
      {page > 1 ? (
        <Button asChild variant="outline" size="sm">
          <Link href={href(page - 1)}>
            <ChevronLeft className="rtl-flip" /> {t("previous")}
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          <ChevronLeft className="rtl-flip" /> {t("previous")}
        </Button>
      )}
      <span className="text-sm text-muted-foreground">
        {t("pageOf", { page, pages })}
      </span>
      {page < pages ? (
        <Button asChild variant="outline" size="sm">
          <Link href={href(page + 1)}>
            {t("next")} <ChevronRight className="rtl-flip" />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          {t("next")} <ChevronRight className="rtl-flip" />
        </Button>
      )}
    </nav>
  );
}
