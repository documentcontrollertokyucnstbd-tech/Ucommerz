import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageSquare } from "lucide-react";
import type { BookingWithRelations, CustomerNote } from "@ucommerz/shared";
import { getTranslations } from "next-intl/server";
import { requireProvider } from "@/app/lib/guards";
import { BOOKING_SELECT } from "@/app/lib/booking-select";
import { avatarOf } from "@/app/lib/media";
import { initials, isUuid } from "@/app/lib/utils";
import { getFormat } from "@/app/lib/format-server";
import { PageHeader } from "@/app/components/PageHeader";
import { StatusBadge } from "@/app/components/StatusBadge";
import { CustomerNotes } from "@/app/components/CustomerNotes";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("DashCustomers");
  return { title: t("detailMeta") };
}

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const f = await getFormat();
  const t = await getTranslations("DashCustomers");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { profile, supabase } = await requireProvider(`/dashboard/customers/${id}`);

  const [{ data: bookingsData }, { data: notesData }, { data: customer }] = await Promise.all([
    supabase.from("bookings").select(BOOKING_SELECT).eq("provider_id", profile.id).eq("seeker_id", id).order("booking_date", { ascending: false }),
    supabase.from("customer_notes").select("*").eq("provider_id", profile.id).eq("customer_id", id).order("created_at", { ascending: false }),
    supabase.from("users").select("id, full_name, avatar_url, location").eq("id", id).maybeSingle(),
  ]);
  const bookings = (bookingsData as BookingWithRelations[] | null) ?? [];
  if (bookings.length === 0 || !customer) notFound();
  const spent = bookings.filter((b) => b.status === "COMPLETED").reduce((s, b) => s + Number(b.total_price), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.full_name ?? t("customer")}
        description={t("detailDesc", { count: bookings.length, amount: f.currency(spent) })}
        actions={<Button asChild variant="outline"><Link href={`/dashboard/messages?to=${id}`}><MessageSquare /> {t("message")}</Link></Button>}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-3">
            <Avatar className="size-12"><AvatarImage src={avatarOf(customer.avatar_url)} alt="" /><AvatarFallback>{initials(customer.full_name)}</AvatarFallback></Avatar>
            <div><CardTitle className="text-base">{t("notesTitle")}</CardTitle><p className="text-xs text-muted-foreground">{customer.location ?? t("private")}</p></div>
          </CardHeader>
          <CardContent><CustomerNotes customerId={id} notes={(notesData as CustomerNote[] | null) ?? []} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{t("history")}</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y">
              {bookings.map((b) => (
                <li key={b.id}>
                  <Link href={`/dashboard/bookings/${b.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-muted/40">
                    <div className="min-w-0"><p className="truncate text-sm font-medium">{b.service?.title ?? t("service")}</p><p className="text-xs text-muted-foreground">{f.date(b.booking_date)} · {f.currency(b.total_price)}</p></div>
                    <StatusBadge status={b.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
