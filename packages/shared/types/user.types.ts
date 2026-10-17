import type { SkillLevel, UserRole, CancellationPolicy } from "../constants";

export type SocialLinks = {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
};

/** Row of public.users (profile mirroring auth.users). */
export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  bio: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number;
  total_reviews: number;
  verified: boolean;
  is_active: boolean;
  slug: string | null;
  social_links: SocialLinks;
  website: string | null;
  created_at: string;
  updated_at: string;
}

export type UserSummary = Pick<
  UserProfile,
  "id" | "full_name" | "avatar_url" | "slug" | "rating" | "total_reviews" | "verified" | "location" | "bio"
>;

export interface ProviderSkill {
  id: string;
  provider_id: string;
  skill_name: string;
  skill_level: SkillLevel;
  years_experience: number;
  created_at: string;
  updated_at: string;
}

export interface ProviderCertification {
  id: string;
  provider_id: string;
  name: string;
  issuing_organization: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  certificate_url: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderPortfolioItem {
  id: string;
  provider_id: string;
  title: string;
  description: string | null;
  image_urls: string[];
  project_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProviderAvailability {
  id: string;
  provider_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessHours {
  id: string;
  provider_id: string;
  day_of_week: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  break_start: string | null;
  break_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface Holiday {
  id: string;
  provider_id: string;
  date: string;
  name: string;
  is_recurring: boolean;
  created_at: string;
}

export interface BookingRules {
  id: string;
  provider_id: string;
  min_notice_hours: number;
  max_bookings_per_day: number;
  buffer_time_minutes: number;
  auto_confirm: boolean;
  cancellation_policy: CancellationPolicy;
  created_at: string;
  updated_at: string;
}

export interface CustomerNote {
  id: string;
  provider_id: string;
  customer_id: string;
  note: string;
  created_at: string;
  updated_at: string;
}
