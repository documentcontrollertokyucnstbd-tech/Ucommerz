import { useTranslations } from "next-intl";
import type { ReviewWithReviewer } from "@ucommerz/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { ReviewStars } from "@/app/components/ReviewStars";
import { ReportButton } from "@/app/components/ReportButton";
import { ReviewResponseForm } from "@/app/components/ReviewResponseForm";
import { avatarOf } from "@/app/lib/media";
import { initials } from "@/app/lib/utils";
import { useFormat } from "@/app/lib/use-format";

/** Server component. `viewerId` enables the respond form for the reviewee and report buttons for others. */
export function ReviewsList({ reviews, viewerId }: { reviews: ReviewWithReviewer[]; viewerId?: string | null }) {
  const t = useTranslations("PubReviews");
  const f = useFormat();
  if (reviews.length === 0) return <p className="text-sm text-muted-foreground">{t("none")}</p>;
  return (
    <ul className="space-y-5">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-xl border bg-card p-4">
          <div className="flex items-start gap-3">
            <Avatar className="size-10">
              <AvatarImage src={avatarOf(r.reviewer?.avatar_url)} alt="" />
              <AvatarFallback>{initials(r.reviewer?.full_name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{r.reviewer?.full_name ?? t("customer")}</p>
                <time className="text-xs text-muted-foreground" dateTime={r.created_at}>{f.date(r.created_at)}</time>
              </div>
              <ReviewStars rating={r.rating} showValue={false} />
              {r.comment && <p className="mt-2 whitespace-pre-line text-sm text-foreground/90">{r.comment}</p>}
              {(r.professionalism || r.quality || r.punctuality) && (
                <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {r.professionalism ? <div className="flex gap-1"><dt>{t("professionalism")}</dt><dd className="font-medium text-foreground">{r.professionalism}/5</dd></div> : null}
                  {r.quality ? <div className="flex gap-1"><dt>{t("quality")}</dt><dd className="font-medium text-foreground">{r.quality}/5</dd></div> : null}
                  {r.punctuality ? <div className="flex gap-1"><dt>{t("punctuality")}</dt><dd className="font-medium text-foreground">{r.punctuality}/5</dd></div> : null}
                </dl>
              )}
              {r.response && (
                <div className="mt-3 rounded-lg border-s-2 border-primary bg-muted/50 p-3 text-sm">
                  <p className="text-xs font-semibold text-primary">{t("response")}</p>
                  <p className="mt-1 whitespace-pre-line">{r.response}</p>
                </div>
              )}
              <div className="mt-2 flex items-center gap-1">
                {viewerId && viewerId === r.reviewee_id && !r.response && <ReviewResponseForm reviewId={r.id} />}
                {viewerId !== r.reviewer_id && <ReportButton targetType="REVIEW" targetId={r.id} signedIn={Boolean(viewerId)} />}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
