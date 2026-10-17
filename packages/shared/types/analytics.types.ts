export interface ProviderStats {
  totalRevenue: number;
  monthRevenue: number;
  totalBookings: number;
  pendingBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  activeServices: number;
  totalCustomers: number;
  averageRating: number;
  totalReviews: number;
  profileViews: number;
}

export interface RevenuePoint {
  label: string;
  revenue: number;
}

export interface BookingsPoint {
  label: string;
  bookings: number;
  completed: number;
  cancelled: number;
}

export interface CategorySlice {
  name: string;
  value: number;
}

export interface ProviderAnalytics {
  revenueByMonth: RevenuePoint[];
  bookingsByMonth: BookingsPoint[];
  bookingsByCategory: CategorySlice[];
  topServices: { id: string; title: string; bookings: number; revenue: number }[];
}
