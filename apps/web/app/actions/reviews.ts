"use server";

import { revalidatePath } from "next/cache";
import { reviewResponseSchema, reviewSchema } from "@ucommerz/shared";
import { requireUser } from "@/app/lib/guards";
import { ActionError, limitAction, ok, parseInput, safeAction, type ActionResult } from "@/app/lib/action";
import { logActivity } from "@/app/lib/activity-service";

export async function createReviewAction(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    await limitAction("create-review", 10, 10 * 60_000);
    const { profile, supabase } = await requireUser();
    const v = parseInput(reviewSchema, input);

    const { data: booking } = await supabase.from("bookings").select("id, status, seeker_id, provider_id, service_id").eq("id", v.booking_id).maybeSingle();
    if (!booking) throw new ActionError("Booking not found.");
    if (booking.seeker_id !== profile.id) throw new ActionError("Only the customer can review this booking.");
    if (booking.status !== "COMPLETED") throw new ActionError("You can review a booking once it's completed.");

    const { data: existing } = await supabase.from("reviews").select("id").eq("booking_id", booking.id).eq("reviewer_id", profile.id).maybeSingle();
    if (existing) throw new ActionError("You've already reviewed this booking.");

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        booking_id: booking.id,
        reviewer_id: profile.id,
        reviewee_id: booking.provider_id,
        service_id: booking.service_id,
        rating: v.rating,
        professionalism: v.professionalism,
        quality: v.quality,
        punctuality: v.punctuality,
        comment: v.comment,
      })
      .select("id")
      .single();
    if (error || !data) throw new ActionError(error?.message ?? "Could not save your review.");

    await logActivity(
      { userId: profile.id, action: "REVIEW_CREATED", targetType: "review", targetId: data.id, description: `Left a ${v.rating}-star review` },
      supabase,
    );
    revalidatePath(`/services/${booking.service_id}`);
    revalidatePath(`/dashboard/bookings/${booking.id}`);
    return ok("Thanks for your review!");
  });
}

export async function respondToReviewAction(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    await limitAction("review-response", 20, 10 * 60_000);
    const { profile, supabase } = await requireUser();
    const v = parseInput(reviewResponseSchema, input);

    const { data, error } = await supabase
      .from("reviews")
      .update({ response: v.response })
      .eq("id", v.review_id)
      .eq("reviewee_id", profile.id)
      .select("id, service_id")
      .maybeSingle();
    if (error) throw new ActionError(error.message);
    if (!data) throw new ActionError("You can only respond to reviews of your own services.");

    await logActivity(
      { userId: profile.id, action: "REVIEW_RESPONDED", targetType: "review", targetId: v.review_id, description: "Responded to a review" },
      supabase,
    );
    revalidatePath(`/services/${data.service_id}`);
    return ok("Response published.");
  });
}
