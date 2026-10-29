"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { BarChart3, Flag, FolderTree, LayoutDashboard, Mail, ScrollText, Settings, ShieldCheck, ClipboardList, Users, Wrench, type LucideIcon } from "lucide-react";
import { cn } from "@/app/lib/utils";

const ITEMS: { href: string; key: string; icon: LucideIcon; superOnly?: boolean }[] = [
  { href: "/admin", key: "overview", icon: LayoutDashboard },
  { href: "/admin/users", key: "users", icon: Users },
  { href: "/admin/services", key: "services", icon: Wrench },
  { href: "/admin/bookings", key: "bookings", icon: ClipboardList },
  { href: "/admin/categories", key: "categories", icon: FolderTree, superOnly: true },
  { href: "/admin/reports", key: "reports", icon: Flag },
  { href: "/admin/audit", key: "audit", icon: ScrollText },
  { href: "/admin/security", key: "security", icon: ShieldCheck, superOnly: true },
  { href: "/admin/email-settings", key: "email", icon: Mail, superOnly: true },
  { href: "/admin/settings", key: "settings", icon: Settings, superOnly: true },
];

export function AdminNav({ role, pendingReports = 0, pendingServices = 0 }: { role: string; pendingReports?: number; pendingServices?: number }) {
  const pathname = usePathname();
  const t = useTranslations("AdmNav");
  const tRole = useTranslations("Role");
  const items = ITEMS.filter((i) => !i.superOnly || role === "SUPERADMIN");
  const active = (href: string) => (href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
  const badge = (href: string) => (href === "/admin/reports" ? pendingReports : href === "/admin/services" ? pendingServices : 0);
  return (
    <>
      <nav aria-label={t("ariaLabel")} className="hidden w-56 shrink-0 lg:block">
        <div className="glass-card sticky top-20 space-y-0.5 rounded-xl border p-3">
          <p className="flex items-center gap-1.5 px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"><BarChart3 className="size-3.5" /> {role === "SUPERADMIN" ? tRole("SUPERADMIN") : t("moderator")}</p>
          {items.map((i) => (
            <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined} className={cn("flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition", active(i.href) ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
              <span className="flex items-center gap-2.5"><i.icon className="size-4" />{t(i.key)}</span>
              {badge(i.href) > 0 && <span className="rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-white">{badge(i.href)}</span>}
            </Link>
          ))}
        </div>
      </nav>
      <nav aria-label={t("ariaLabel")} className="-mx-4 mb-4 overflow-x-auto px-4 lg:hidden scrollbar-thin">
        <ul className="flex gap-2 pb-2">
          {items.map((i) => (
            <li key={i.href} className="shrink-0">
              <Link href={i.href} className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium", active(i.href) ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground")}>
                <i.icon className="size-3.5" />{t(i.key)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
