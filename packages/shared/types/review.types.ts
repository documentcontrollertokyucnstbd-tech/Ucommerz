import type { UserSummary } from "./user.types";

export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  service_id: string;
  rating: number;
  comment: string | null;
  professionalism: number | null;
  quality: number | null;
  punctuality: number | null;
  /** Provider's written response. */
  response: string | null;
  response_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ReviewWithReviewer = Review & {
  reviewer: Pick<UserSummary, "id" | "full_name" | "avatar_url"> | null;
};
