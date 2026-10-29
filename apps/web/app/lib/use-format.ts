import { useLocale } from "next-intl";
import { formatCurrency, formatDate, formatDateTime, formatRelative, intlTag } from "@/app/lib/utils";

/** Locale-bound formatters for client components and non-async server components. */
export function useFormat() {
  const locale = useLocale();
  return {
    locale,
    tag: intlTag(locale),
    currency: (v: number | string | null | undefined, currency?: string) => formatCurrency(v, currency, locale),
    date: (v: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions) => formatDate(v, opts, locale),
    dateTime: (v: string | Date | null | undefined) => formatDateTime(v, locale),
    relative: (v: string | Date | null | undefined) => formatRelative(v, locale),
  };
}
