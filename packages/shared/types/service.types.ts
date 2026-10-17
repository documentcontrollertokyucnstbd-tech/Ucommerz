import type { PriceUnit, ServiceStatus } from "../constants";
import type { UserSummary } from "./user.types";

export type ServiceAvailability = { days?: number[]; notes?: string };

export interface Service {
  id: string;
  provider_id: string;
  title: string;
  description: string | null;
  category: string | null;
  sub_category: string | null;
  price: number;
  price_unit: PriceUnit;
  min_duration: number | null;
  max_duration: number | null;
  images: string[];
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  is_remote: boolean;
  is_on_site: boolean;
  service_address: string | null;
  service_latitude: number | null;
  service_longitude: number | null;
  service_radius: number | null;
  availability: ServiceAvailability;
  status: ServiceStatus;
  views: number;
  featured: boolean;
  rating: number;
  total_reviews: number;
  created_at: string;
  updated_at: string;
}

export type ServiceWithProvider = Service & {
  provider: UserSummary | null;
  /** Distance in km when produced by proximity search. */
  distance_km?: number;
};

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  parent_id: string | null;
  order_position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CategoryNode = Category & { children: Category[]; service_count: number };

export interface ServicePackage {
  id: string;
  provider_id: string;
  title: string;
  description: string | null;
  price: number;
  discount_percentage: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PackageService {
  id: string;
  package_id: string;
  service_id: string;
  quantity: number;
  created_at: string;
}

export type PackageWithServices = ServicePackage & {
  package_services: (PackageService & { service: Pick<Service, "id" | "title" | "price" | "price_unit"> | null })[];
};

export interface PackageBooking {
  id: string;
  package_id: string;
  seeker_id: string;
  provider_id: string;
  booking_date: string;
  total_price: number;
  status: string;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  service_id: string;
  created_at: string;
}

export interface ServiceFilters {
  q?: string;
  category?: string;
  subCategory?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  remote?: boolean;
  sort?: "featured" | "price-low" | "price-high" | "rating" | "newest";
  page?: number;
}
