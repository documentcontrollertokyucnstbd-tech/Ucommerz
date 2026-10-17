import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/app/components/Providers";
import { ChromeGate } from "@/app/components/ChromeGate";
import { SiteHeader } from "@/app/components/SiteHeader";
import { Footer } from "@/app/components/Footer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-plus-jakarta", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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
  },
  twitter: { card: "summary_large_image", title: "UCOMMERZ", description: "Book trusted experts for every service." },
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${plusJakarta.variable} bg-background`}>
      <body className="min-h-screen font-sans antialiased">
        <Providers>
          <ChromeGate header={<SiteHeader />} footer={<Footer />}>
            {children}
          </ChromeGate>
        </Providers>
      </body>
    </html>
  );
}
