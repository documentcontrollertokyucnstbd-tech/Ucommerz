import { isStaffRole } from "@ucommerz/shared";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { PAGE_SIZE, USER_ROLES, type UserProfile } from "@ucommerz/shared";
import { requireAdmin } from "@/app/lib/guards";
import { cn, first, parsePositiveInt, sanitizeSearch, initials } from "@/app/lib/utils";
import { getFormat } from "@/app/lib/format-server";
import { avatarOf } from "@/app/lib/media";
import { AdminCreateUser } from "@/app/components/AdminCreateUser";
import { PageHeader } from "@/app/components/PageHeader";
import { Pagination } from "@/app/components/Pagination";
import { AdminSearch } from "@/app/components/AdminSearch";
import { AdminUserActions } from "@/app/components/AdminUserActions";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { Card } from "@/app/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdmUsers");
  return { title: t("metaTitle") };
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const f = await getFormat();
  const sp = await searchParams;
  const t = await getTranslations("AdmUsers");
  const tRole = await getTranslations("Role");
  const { profile, supabase } = await requireAdmin();
  const q = sanitizeSearch(first(sp.q) ?? "");
  const role = USER_ROLES.find((r) => r === first(sp.role));
  const page = parsePositiveInt(first(sp.page), 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase.from("users").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  if (role) query = query.eq("role", role);
  const { data, count } = await query.range(from, from + PAGE_SIZE - 1);
  const users = (data as UserProfile[] | null) ?? [];

  const chip = (active: boolean) => cn("rounded-full border px-3 py-1 text-xs font-medium", active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground");
  const href = (r?: string) => `/admin/users${r || q ? `?${new URLSearchParams({ ...(r ? { role: r } : {}), ...(q ? { q } : {}) }).toString()}` : ""}`;

  return (
    <div className="space-y-4">
      <PageHeader title={t("title")} description={t("accounts", { count: count ?? 0 })} actions={<>{profile.role === "SUPERADMIN" && <AdminCreateUser />}<AdminSearch basePath="/admin/users" params={{ role }} placeholder={t("searchPlaceholder")} /></>} />
      <div className="flex flex-wrap gap-2">
        <Link href={href()} className={chip(!role)}>{t("all")}</Link>
        {USER_ROLES.map((r) => <Link key={r} href={href(r)} className={chip(role === r)}>{tRole(r)}</Link>)}
      </div>
      <Card className="py-0">
        <Table>
          <TableHeader><TableRow><TableHead>{t("colUser")}</TableHead><TableHead>{t("colRole")}</TableHead><TableHead>{t("colStatus")}</TableHead><TableHead>{t("colJoined")}</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8"><AvatarImage src={avatarOf(u.avatar_url)} alt="" /><AvatarFallback>{initials(u.full_name)}</AvatarFallback></Avatar>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 font-medium">{u.full_name ?? "—"} {u.verified && <BadgeCheck className="size-3.5 text-primary" aria-label={t("verified")} />}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell><Badge variant={isStaffRole(u.role) ? "destructive" : "secondary"}>{tRole(u.role)}</Badge></TableCell>
                <TableCell><Badge variant={u.is_active ? "success" : "muted"}>{u.is_active ? t("active") : t("suspended")}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{f.date(u.created_at)}</TableCell>
                <TableCell><AdminUserActions id={u.id} name={u.full_name ?? u.email} role={u.role} isActive={u.is_active} verified={u.verified} isSelf={u.id === profile.id} targetIsStaff={isStaffRole(u.role)} viewerIsSuper={profile.role === "SUPERADMIN"} /></TableCell>
              </TableRow>
            ))}
            {users.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">{t("empty")}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
      <Pagination page={page} total={count ?? 0} pageSize={PAGE_SIZE} basePath="/admin/users" params={{ role, q: q || undefined }} />
    </div>
  );
}
