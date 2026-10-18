import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans, Noto_Sans_Bengali, Noto_Sans_Devanagari, Noto_Naskh_Arabic } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { LOCALE_META, isLocale } from "@/app/i18n/config";
import { Providers } from "@/app/components/Providers";
import { ChromeGate } from "@/app/components/ChromeGate";
import { SiteHeader } from "@/app/components/SiteHeader";
import { Footer } from "@/app/components/Footer";
import { getSiteUrl } from "@/app/lib/site-url";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-plus-jakarta", display: "swap" });
// Script fonts are only downloaded by the browser when a page actually contains those characters.
const notoBengali = Noto_Sans_Bengali({ subsets: ["bengali"], weight: ["400", "500", "600", "700", "800"], variable: "--font-noto-bengali", display: "swap", preload: false });
const notoDevanagari = Noto_Sans_Devanagari({ subsets: ["devanagari"], weight: ["400", "500", "600", "700", "800"], variable: "--font-noto-devanagari", display: "swap", preload: false });
const notoArabic = Noto_Naskh_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600", "700"], variable: "--font-noto-arabic", display: "swap", preload: false });

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "UCOMMERZ — Book Trusted Experts for Every Service",
    template: "%s · UCOMMERZ",
  },
  description:
    "UCOMMERZ is the on-demand service marketplace connecting clients with verified local professionals. Compare upfront pricing, schedule flexible appointments and manage service requests securely.",
  keywords: ["service marketplace", "hire professionals", "book services", "verified providers", "freelancers"],
  applicationName: "UCOMMERZ",
  openGraph: {
    type: "website",
    siteName: "UCOMMERZ",
    title: "UCOMMERZ — Book Trusted Experts for Every Service",
    description: "Connect with verified local professionals and book with confidence.",
    url: siteUrl,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "UCOMMERZ — Book trusted experts for every service" }],
  },
  twitter: { card: "summary_large_image", title: "UCOMMERZ", description: "Book trusted experts for every service.", images: ["/og-image.png"] },
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1633" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = isLocale(locale) ? LOCALE_META[locale].dir : "ltr";
  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${inter.variable} ${plusJakarta.variable} ${notoBengali.variable} ${notoDevanagari.variable} ${notoArabic.variable} bg-background`}
    >
      <body className="min-h-screen font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <ChromeGate header={<SiteHeader />} footer={<Footer />}>
              {children}
            </ChromeGate>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
