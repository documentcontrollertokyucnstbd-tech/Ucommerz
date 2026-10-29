import { getLocale } from "next-intl/server";
import { formatCurrency, formatDate, formatDateTime, formatRelative, intlTag } from "@/app/lib/utils";

/** Locale-bound formatters for async server components / pages: `const f = await getFormat();` */
export async function getFormat() {
  const locale = await getLocale();
  return {
    locale,
    tag: intlTag(locale),
    currency: (v: number | string | null | undefined, currency?: string) => formatCurrency(v, currency, locale),
    date: (v: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions) => formatDate(v, opts, locale),
    dateTime: (v: string | Date | null | undefined) => formatDateTime(v, locale),
    relative: (v: string | Date | null | undefined) => formatRelative(v, locale),
  };
}
