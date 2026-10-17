import type { MessageType, NotificationType, TemplateCategory } from "../constants";
import type { UserSummary } from "./user.types";

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  booking_id: string | null;
  content: string;
  attachments: string[];
  is_read: boolean;
  read_at: string | null;
  message_type: MessageType;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  partner: Pick<UserSummary, "id" | "full_name" | "avatar_url">;
  lastMessage: Pick<Message, "id" | "content" | "created_at" | "sender_id" | "message_type">;
  unreadCount: number;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType | string;
  title: string;
  message: string | null;
  metadata: Record<string, unknown>;
  link: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageTemplate {
  id: string;
  provider_id: string;
  name: string;
  subject: string | null;
  content: string;
  category: TemplateCategory;
  variables: string[];
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}
