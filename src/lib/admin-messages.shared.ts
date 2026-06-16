export const ADMIN_MESSAGE_MAX_LENGTH = 300;
export const ADMIN_MESSAGE_HISTORY_LIMIT = 20;
export const ADMIN_MESSAGE_SENDER_LABEL = "CabRadar Admin";

export type AdminMessageRecipientType = "all" | "user";

export interface AdminMessageHistoryItem {
  id: string;
  message: string;
  recipient_type: AdminMessageRecipientType;
  recipient_label: string;
  important: boolean;
  created_at: string;
  time_label: string;
  preview: string;
}

export interface ActiveDriverOption {
  id: string;
  label: string;
  nickname: string | null;
  taxi_number: string | null;
  subtitle: string;
}

export interface DriverInboxMessage {
  delivery_id: string;
  message_id: string;
  message: string;
  important: boolean;
  sender_label: string;
  created_at: string;
  time_label: string;
}
