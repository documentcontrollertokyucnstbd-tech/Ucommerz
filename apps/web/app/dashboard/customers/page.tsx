import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireProvider } from "@/app/lib/guards";
import { avatarOf } from "@/app/lib/media";
import { initials } from "@/app/lib/utils";
import { getFormat } from "@/app/lib/format-server";
import { PageHeader } from "@/app/components/PageHeader";
import { EmptyState } from "@/app/components/EmptyState";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Card } from "@/app/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("DashCustomers");
  return { title: t("metaTitle") };
}

type Row = { seeker_id: string; total_price: number; status: string; booking_date: string; seeker: { id: string; full_name: string | null; avatar_url: string | null } | null };

export default async function CustomersPage() {
  const f = await getFormat();
  const t = await getTranslations("DashCustomers");
  const { profile, supabase } = await requireProvider("/dashboard/customers");
  const { data } = await supabase
    .from("bookings")
    .select("seeker_id, total_price, status, booking_date, seeker:users!bookings_seeker_id_fkey(id, full_name, avatar_url)")
    .eq("provider_id", profile.id)
    .order("booking_date", { ascending: false })
    .limit(1000);
  const rows = (data as unknown as Row[] | null) ?? [];

  const map = new Map<string, { id: string; name: string | null; avatar: string | null; bookings: number; spent: number; last: string }>();
  for (const r of rows) {
    const c = map.get(r.seeker_id) ?? { id: r.seeker_id, name: r.seeker?.full_name ?? null, avatar: r.seeker?.avatar_url ?? null, bookings: 0, spent: 0, last: r.booking_date };
    c.bookings += 1;
    if (r.status === "COMPLETED") c.spent += Number(r.total_price);
    map.set(r.seeker_id, c);
  }
  const customers = [...map.values()];

  return (
    <div>
      <PageHeader title={t("title")} description={t("desc")} />
      {customers.length === 0 ? (
        <EmptyState icon={<Users className="size-5" />} title={t("emptyTitle")} description={t("emptyDesc")} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {customers.map((c) => (
            <Link key={c.id} href={`/dashboard/customers/${c.id}`}>
              <Card className="flex-row items-center gap-3 p-4 transition hover:shadow-md">
                <Avatar className="size-11"><AvatarImage src={avatarOf(c.avatar)} alt="" /><AvatarFallback>{initials(c.name)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.name ?? t("customer")}</p>
                  <p className="text-xs text-muted-foreground">{t("row", { count: c.bookings, date: f.date(c.last) })}</p>
                </div>
                <span className="text-sm font-semibold text-primary">{f.currency(c.spent)}</span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
