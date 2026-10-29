"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BellRing,
  Briefcase,
  CalendarDays,
  ClipboardList,
  FileText,
  Heart,
  History,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  UserCircle,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@ucommerz/shared";
import { useTranslations } from "next-intl";
import { cn } from "@/app/lib/utils";

type Item = { href: string; label: string; icon: LucideIcon; roles?: readonly UserRole[] };
type Group = { title: string; items: Item[] };

const PROVIDER: readonly UserRole[] = ["PROVIDER", "BOTH"];
const SEEKER: readonly UserRole[] = ["SEEKER", "BOTH"];

const GROUPS: Group[] = [
  {
    title: "general",
    items: [
      { href: "/dashboard", label: "overview", icon: LayoutDashboard },
      { href: "/dashboard/bookings", label: "bookings", icon: ClipboardList },
      { href: "/dashboard/calendar", label: "calendar", icon: CalendarDays },
      { href: "/dashboard/messages", label: "messages", icon: MessageSquare },
      { href: "/dashboard/favorites", label: "favorites", icon: Heart, roles: SEEKER },
      { href: "/dashboard/history", label: "history", icon: History },
      { href: "/profile", label: "profile", icon: UserCircle },
    ],
  },
  {
    title: "provider",
    items: [
      { href: "/dashboard/provider-dashboard", label: "providerHome", icon: Briefcase, roles: PROVIDER },
      { href: "/dashboard/my-services", label: "myServices", icon: Wrench, roles: PROVIDER },
      { href: "/dashboard/my-packages", label: "packages", icon: Package, roles: PROVIDER },
      { href: "/dashboard/customers", label: "customers", icon: Users, roles: PROVIDER },
      { href: "/dashboard/provider-analytics", label: "analytics", icon: BarChart3, roles: PROVIDER },
      { href: "/dashboard/provider-profile", label: "providerProfile", icon: UserCircle, roles: PROVIDER },
      { href: "/dashboard/message-templates", label: "messageTemplates", icon: FileText, roles: PROVIDER },
      { href: "/dashboard/reminder-settings", label: "reminders", icon: BellRing, roles: PROVIDER },
      { href: "/dashboard/provider-settings", label: "bookingSettings", icon: Settings, roles: PROVIDER },
    ],
  },
];

export function DashboardNav({ role }: { role: UserRole }) {
  const t = useTranslations("DashNav");
  const pathname = usePathname();
  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !i.roles || i.roles.includes(role)) })).filter((g) => g.items.length > 0);
  const isActive = (href: string) => (href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <>
      {/* desktop sidebar */}
      <nav aria-label={t("aria")} className="hidden w-60 shrink-0 lg:block">
        <div className="glass-card sticky top-20 max-h-[calc(100dvh-6rem)] space-y-5 overflow-y-auto rounded-xl border p-3 scrollbar-thin">
          {groups.map((g) => (
            <div key={g.title}>
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t(`groups.${g.title}`)}</p>
              <ul className="space-y-0.5">
                {g.items.map((i) => (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      aria-current={isActive(i.href) ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition",
                        isActive(i.href) ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      <i.icon className="size-4" />
                      {t(`items.${i.label}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>
      {/* mobile scroller */}
      <nav aria-label={t("aria")} className="-mx-4 mb-4 overflow-x-auto px-4 lg:hidden scrollbar-thin">
        <ul className="flex gap-2 pb-2">
          {groups.flatMap((g) => g.items).map((i) => (
            <li key={i.href} className="shrink-0">
              <Link
                href={i.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
                  isActive(i.href) ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
                )}
              >
                <i.icon className="size-3.5" />
                {t(`items.${i.label}`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
