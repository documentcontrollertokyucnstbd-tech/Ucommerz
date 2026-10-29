import { isStaffRole } from "@ucommerz/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CalendarClock, Check, Circle, MapPin, MessageSquare, XCircle } from "lucide-react";
import type { BookingWithRelations, Review, TimelineEvent } from "@ucommerz/shared";
import { requireUser } from "@/app/lib/guards";
import { BOOKING_SELECT } from "@/app/lib/booking-select";
import { cn, isUuid } from "@/app/lib/utils";
import { getFormat } from "@/app/lib/format-server";
import { avatarOf, serviceImage } from "@/app/lib/media";
import { PageHeader } from "@/app/components/PageHeader";
import { StatusBadge } from "@/app/components/StatusBadge";
import { BookingActions } from "@/app/components/BookingActions";
import { ReviewForm } from "@/app/components/ReviewForm";
import { ReviewStars } from "@/app/components/ReviewStars";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { initials } from "@/app/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("DashBookings");
  return { title: t("detailMeta") };
}

function buildTimeline(b: BookingWithRelations, t: (key: string) => string): TimelineEvent[] {
  const order = ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED"] as const;
  const rank = order.indexOf(b.status as (typeof order)[number]);
  const events: TimelineEvent[] = [{ status: "REQUESTED", label: t("tl.REQUESTED"), at: b.created_at, done: true }];
  if (b.status === "CANCELLED" || b.status === "DISPUTED") {
    events.push({ status: b.status, label: b.status === "CANCELLED" ? t("tl.CANCELLED") : t("tl.DISPUTED"), at: b.updated_at, done: true });
    return events;
  }
  events.push({ status: "CONFIRMED", label: t("tl.CONFIRMED"), at: rank >= 1 ? b.updated_at : null, done: rank >= 1 });
  events.push({ status: "IN_PROGRESS", label: t("tl.IN_PROGRESS"), at: null, done: rank >= 2 });
  events.push({ status: "COMPLETED", label: t("tl.COMPLETED"), at: b.completed_at, done: rank >= 3 });
  return events;
}

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const f = await getFormat();
  const t = await getTranslations("DashBookings");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { profile, supabase } = await requireUser(`/dashboard/bookings/${id}`);

  const { data } = await supabase.from("bookings").select(BOOKING_SELECT).eq("id", id).maybeSingle();
  const booking = data as BookingWithRelations | null;
  if (!booking) notFound();

  const isProvider = booking.provider_id === profile.id;
  const isSeeker = booking.seeker_id === profile.id;
  if (!isProvider && !isSeeker && !isStaffRole(profile.role)) notFound();
  const side = isProvider ? "provider" : isSeeker ? "seeker" : "admin";
  const other = isProvider ? booking.seeker : booking.provider;

  const { data: reviewRow } = await supabase.from("reviews").select("*").eq("booking_id", id).maybeSingle();
  const review = reviewRow as Review | null;
  const timeline = buildTimeline(booking, (k) => t(k));
  const upcoming = new Date(booking.booking_date).getTime() > Date.now() && (booking.status === "CONFIRMED" || booking.status === "PENDING");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("detailTitle")}
        description={t("reference", { ref: booking.id.slice(0, 8).toUpperCase() })}
        actions={<StatusBadge status={booking.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="flex flex-col gap-4 sm:flex-row">
              <img src={booking.service ? serviceImage({ images: booking.service.images, category: booking.service.category }) : "/placeholder.jpg"} alt="" className="aspect-video w-full rounded-lg object-cover sm:w-48" />
              <div className="min-w-0 space-y-2">
                <h2 className="font-display text-lg font-semibold">
                  {booking.service ? <Link href={`/services/${booking.service.id}`} className="hover:underline">{booking.service.title}</Link> : t("serviceRemoved")}
                </h2>
                <p className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarClock className="size-4" />{t("hoursLine", { date: f.dateTime(booking.booking_date), hours: Number(booking.duration) })}</p>
                {booking.service?.location && <p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4" />{booking.service.location}</p>}
                <p className="text-xl font-bold text-primary">{f.currency(booking.total_price)}</p>
                {booking.notes && <p className="rounded-lg bg-muted/50 p-3 text-sm"><span className="font-medium">{t("notes")}</span>{booking.notes}</p>}
                {booking.cancellation_reason && <p className="flex items-start gap-2 rounded-lg bg-destructive/5 p-3 text-sm text-destructive"><XCircle className="mt-0.5 size-4 shrink-0" />{booking.cancellation_reason}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">{t("actions")}</CardTitle></CardHeader>
            <CardContent>
              <BookingActions bookingId={booking.id} status={booking.status} side={side} canRemind={isProvider && upcoming} />
              
            </CardContent>
          </Card>

          {booking.status === "COMPLETED" && isSeeker && (
            <Card>
              <CardHeader><CardTitle className="text-base">{review ? t("yourReview") : t("leaveReview")}</CardTitle></CardHeader>
              <CardContent>
                {review ? (
                  <div className="space-y-2 text-sm">
                    <ReviewStars rating={review.rating} />
                    <p className="whitespace-pre-line">{review.comment}</p>
                    {review.response && <p className="rounded-lg border-s-2 border-primary bg-muted/50 p-3"><span className="font-medium">{t("providerResponse")}</span>{review.response}</p>}
                  </div>
                ) : (
                  <ReviewForm bookingId={booking.id} />
                )}
              </CardContent>
            </Card>
          )}
          {booking.status === "COMPLETED" && isProvider && review && (
            <Card>
              <CardHeader><CardTitle className="text-base">{t("customerReview")}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <ReviewStars rating={review.rating} />
                <p className="whitespace-pre-line">{review.comment}</p>
                {!review.response && <Button asChild variant="outline" size="sm"><Link href={`/services/${booking.service_id}#reviews-heading`}>{t("respondOnService")}</Link></Button>}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {other && (
            <Card>
              <CardHeader><CardTitle className="text-base">{isProvider ? t("customer") : t("provider")}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-11"><AvatarImage src={avatarOf(other.avatar_url)} alt="" /><AvatarFallback>{initials(other.full_name)}</AvatarFallback></Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{other.full_name}</p>
                    {!isProvider && other.slug && <Link href={`/provider/${other.slug}`} className="text-xs text-primary hover:underline">{t("viewProfile")}</Link>}
                    {isProvider && <Link href={`/dashboard/customers/${other.id}`} className="text-xs text-primary hover:underline">{t("customerNotes")}</Link>}
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="w-full"><Link href={`/dashboard/messages?to=${other.id}&booking=${booking.id}`}><MessageSquare /> {t("sendMessage")}</Link></Button>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle className="text-base">{t("timeline")}</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {timeline.map((e) => (
                  <li key={e.status} className="flex items-start gap-3">
                    <span className={cn("mt-0.5 flex size-5 items-center justify-center rounded-full border", e.done ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground")}>
                      {e.done ? <Check className="size-3" /> : <Circle className="size-2.5" />}
                    </span>
                    <div>
                      <p className={cn("text-sm font-medium", !e.done && "text-muted-foreground")}>{e.label}</p>
                      {e.at && <p className="text-xs text-muted-foreground">{f.dateTime(e.at)}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
