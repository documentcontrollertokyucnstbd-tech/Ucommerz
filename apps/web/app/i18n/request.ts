import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, negotiateLocale, type Locale } from "./config";

type Messages = Record<string, unknown>;

/** Deep-merge so a language that is only partly translated falls back to English for the missing keys. */
function merge(base: Messages, over: Messages): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(over)) {
    const current = out[key];
    out[key] =
      value && typeof value === "object" && !Array.isArray(value) && current && typeof current === "object"
        ? merge(current as Messages, value as Messages)
        : value;
  }
  return out;
}

/** Extra message files per language (messages/<locale>/<name>.json), merged on top of messages/<locale>.json. */
const PARTS = ["public", "dashboard", "admin", "common"] as const;

async function part(locale: Locale, name: (typeof PARTS)[number]): Promise<Messages> {
  try {
    return (await import(`../../messages/${locale}/${name}.json`)).default as Messages;
  } catch {
    return {};
  }
}

async function load(locale: Locale): Promise<Messages> {
  let out = (await import(`../../messages/${locale}.json`)).default as Messages;
  for (const name of PARTS) out = merge(out, await part(locale, name));
  return out;
}

export default getRequestConfig(async () => {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(fromCookie) ? fromCookie : negotiateLocale((await headers()).get("accept-language"));
  const english = await load(DEFAULT_LOCALE);
  const messages = locale === DEFAULT_LOCALE ? english : merge(english, await load(locale));
  return { locale, messages };
});
