"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { reviewSchema, type ReviewInput } from "@ucommerz/shared";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { Label } from "@/app/components/ui/label";
import { StarInput } from "@/app/components/ReviewStars";
import { createReviewAction } from "@/app/actions/reviews";
import { toastAction } from "@/app/lib/toast-action";

const CRITERIA = [
  { key: "rating", label: "Overall" },
  { key: "professionalism", label: "Professionalism" },
  { key: "quality", label: "Quality of work" },
  { key: "punctuality", label: "Punctuality" },
] as const;

export function ReviewForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReviewInput>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { booking_id: bookingId, rating: 0, professionalism: 0, quality: 0, punctuality: 0, comment: "" },
  });

  async function onSubmit(values: ReviewInput) {
    const res = await toastAction(createReviewAction(values));
    if (res.ok) router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        {CRITERIA.map((c) => (
          <div key={c.key} className="grid gap-1.5">
            <Label>{c.label}</Label>
            <Controller control={control} name={c.key} render={({ field }) => <StarInput value={field.value} onChange={field.onChange} label={c.label} />} />
            {errors[c.key] && <p className="text-sm text-destructive">Select a rating</p>}
          </div>
        ))}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="review-comment">Your review</Label>
        <Textarea id="review-comment" rows={4} placeholder="How was your experience?" {...register("comment")} />
        {errors.comment && <p className="text-sm text-destructive">{errors.comment.message}</p>}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" />} Submit review
      </Button>
    </form>
  );
}
