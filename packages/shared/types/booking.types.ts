import type { BookingStatus, ReminderStatus, ReminderType } from "../constants";
import type { Service } from "./service.types";
import type { UserSummary } from "./user.types";

export interface Booking {
  id: string;
  service_id: string;
  seeker_id: string;
  provider_id: string;
  booking_date: string;
  duration: number;
  total_price: number;
  status: BookingStatus;
  notes: string | null;
  cancellation_reason: string | null;
  completed_at: string | null;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
}

export type BookingWithRelations = Booking & {
  service: Pick<Service, "id" | "title" | "images" | "price" | "price_unit" | "category" | "location"> | null;
  seeker: UserSummary | null;
  provider: UserSummary | null;
};

export interface Reminder {
  id: string;
  booking_id: string;
  recipient_email: string | null;
  recipient_phone: string | null;
  reminder_type: ReminderType;
  reminder_time: string;
  sent_at: string | null;
  status: ReminderStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReminderSettings {
  id: string;
  provider_id: string;
  enabled: boolean;
  reminder_hours: number;
  send_email: boolean;
  send_sms: boolean;
  sms_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimelineEvent {
  status: BookingStatus | "REQUESTED";
  label: string;
  at: string | null;
  done: boolean;
}
