"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NO_FOOTER_PREFIXES = ["/dashboard", "/admin", "/login", "/register", "/forgot-password", "/reset-password"];

/**
 * Renders the global header (server component passed as a prop) and hides the
 * marketing footer inside the dashboard, admin panel and auth screens.
 */
export function ChromeGate({ header, footer, children }: { header: ReactNode; footer: ReactNode; children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const hideFooter = NO_FOOTER_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  return (
    <div className="flex min-h-screen flex-col">
      {header}
      <div className="flex-1">{children}</div>
      {hideFooter ? null : footer}
    </div>
  );
}
