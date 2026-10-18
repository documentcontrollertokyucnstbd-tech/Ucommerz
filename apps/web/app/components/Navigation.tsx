"use client";

import { isStaffRole } from "@ucommerz/shared";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import {
  FolderTree,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  User,
  Briefcase,
  X,
} from "lucide-react";
import { PROVIDER_ROLES, type UserRole } from "@ucommerz/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { Logo } from "@/app/components/Logo";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { LanguageSwitcher } from "@/app/components/LanguageSwitcher";
import { Notifications } from "@/app/components/Notifications";
import { signOutAction } from "@/app/actions/auth";
import { cn, initials } from "@/app/lib/utils";
import { createClient as createBrowserSupabase } from "@/app/lib/supabase/client";

export type NavUser = {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role: UserRole;
};

const NAV = [
  { key: "home", href: "/" },
  { key: "browse", href: "/browse" },
  { key: "categories", href: "/categories" },
] as const;

export function Navigation({ user }: { user: NavUser | null }) {
  const t = useTranslations("Nav");
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const isProvider = user ? PROVIDER_ROLES.includes(user.role) : false;
  const staff = user ? isStaffRole(user.role) : false;
  const [unreadMessages, setUnreadMessages] = useState(0);
  const userId = user?.id;

  // Unread badge is fetched in the browser so it never delays the server-rendered page.
  useEffect(() => {
    if (!userId || staff) {
      setUnreadMessages(0);
      return;
    }
    let cancelled = false;
    createBrowserSupabase()
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", userId)
      .eq("is_read", false)
      .then(({ count }) => {
        if (!cancelled) setUnreadMessages(count ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, staff, pathname]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/browse?q=${encodeURIComponent(q)}` : "/browse");
    setOpen(false);
  }

  function signOut() {
    startTransition(async () => {
      toast.success(t("signedOut"));
      await signOutAction();
    });
  }

  return (
    <header className="glass sticky top-0 z-50 border-x-0 border-t-0">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label={t("mainNav")}>
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-foreground",
                    active ? "bg-accent text-foreground" : "text-muted-foreground",
                  )}
                >
                  {item.key === "home" && <Home className="size-4" />}
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>
        </div>

        <form onSubmit={onSearch} className="relative hidden max-w-xs flex-1 lg:block" role="search">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchLabel")}
            className="h-9 rounded-full ps-9"
          />
        </form>

        <div className="flex items-center gap-1.5">
          <Button asChild variant="ghost" size="icon" className="lg:hidden">
            <Link href="/browse" aria-label={t("searchLabel")}>
              <Search className="size-5" />
            </Link>
          </Button>
          <LanguageSwitcher />
          <ThemeToggle />

          {user ? (
            <>
              {!staff && <Button asChild variant="ghost" size="icon" className="relative hidden sm:inline-flex">
                <Link href="/dashboard/messages" aria-label={t("messages")}>
                  <MessageSquare className="size-5" />
                  {unreadMessages > 0 && (
                    <Badge className="absolute -end-1 -top-1 h-4 min-w-4 justify-center px-1 text-[10px]">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </Badge>
                  )}
                </Link>
              </Button>}
              <Notifications userId={user.id} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 gap-2 rounded-full px-1.5 sm:pr-3" aria-label={t("accountMenu")}>
                    <Avatar className="size-8">
                      <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name ?? "Account"} />
                      <AvatarFallback>{initials(user.full_name ?? user.email)}</AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-28 truncate text-sm font-medium sm:inline">{user.full_name ?? user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="truncate">{user.full_name ?? t("yourAccount")}</span>
                    <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
                    <Badge variant="muted" className="mt-1 w-fit">{user.role.toLowerCase()}</Badge>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {!staff && (
                    <>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard"><LayoutDashboard /> {t("dashboard")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/bookings"><Briefcase /> {t("myBookings")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/messages">
                      <MessageSquare /> {t("messages")}
                      {unreadMessages > 0 && <Badge className="ms-auto h-4 px-1.5 text-[10px]">{unreadMessages}</Badge>}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/favorites"><Heart /> {t("favorites")}</Link>
                  </DropdownMenuItem>
                  {isProvider && (
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/provider-dashboard"><Briefcase /> {t("providerDashboard")}</Link>
                    </DropdownMenuItem>
                  )}
                    </>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/profile"><User /> {t("profile")}</Link>
                  </DropdownMenuItem>
                  {isProvider && !staff && (
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/provider-settings"><Settings /> {t("providerSettings")}</Link>
                    </DropdownMenuItem>
                  )}
                  {isStaffRole(user.role) && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin"><ShieldCheck /> {t("adminPanel")}</Link>
                    </DropdownMenuItem>
                  )}
                  {user.role === "SUPERADMIN" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/categories"><FolderTree /> {t("manageCategories")}</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" disabled={pending} onSelect={signOut}>
                    <LogOut /> {t("signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button asChild variant="outline" size="sm">
                <Link href="/login">{t("signIn")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">{t("getStarted")}</Link>
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={t("toggleMenu")}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background/95 md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-3" aria-label={t("mobileNav")}>
            <form onSubmit={onSearch} className="relative mb-2" role="search">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchPlaceholder")} aria-label={t("searchLabel")} className="ps-9" />
            </form>
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {t(item.key)}
              </Link>
            ))}
            {user ? (
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {t("dashboard")}
              </Link>
            ) : (
              <div className="mt-2 flex gap-2">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link href="/login" onClick={() => setOpen(false)}>{t("signIn")}</Link>
                </Button>
                <Button asChild size="sm" className="flex-1">
                  <Link href="/register" onClick={() => setOpen(false)}>{t("getStarted")}</Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
