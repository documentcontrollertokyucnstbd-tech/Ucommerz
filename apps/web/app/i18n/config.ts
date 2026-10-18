/** Supported UI languages. Add a language: add it here + drop `messages/<code>.json` (missing keys fall back to English). */
export const LOCALES = ["en", "bn", "hi", "ur", "zh", "ja", "ru", "ar", "es", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const LOCALE_META: Record<Locale, { name: string; dir: "ltr" | "rtl" }> = {
  en: { name: "English", dir: "ltr" },
  bn: { name: "বাংলা", dir: "ltr" },
  hi: { name: "हिन्दी", dir: "ltr" },
  ur: { name: "اردو", dir: "rtl" },
  zh: { name: "中文", dir: "ltr" },
  ja: { name: "日本語", dir: "ltr" },
  ru: { name: "Русский", dir: "ltr" },
  ar: { name: "العربية", dir: "rtl" },
  es: { name: "Español", dir: "ltr" },
  fr: { name: "Français", dir: "ltr" },
};

export function isLocale(value: string | null | undefined): value is Locale {
  return Boolean(value) && (LOCALES as readonly string[]).includes(value as string);
}

/** Pick the best supported language from an Accept-Language header (e.g. "bn-BD,bn;q=0.9,en;q=0.8"). */
export function negotiateLocale(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const wanted = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { code: (tag ?? "").toLowerCase().split("-")[0] ?? "", q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { code } of wanted) if (isLocale(code)) return code;
  return DEFAULT_LOCALE;
}
