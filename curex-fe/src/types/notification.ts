export type NotificationReadStatus = "UNREAD" | "READ";

export type NotificationChannel = "EMAIL" | "SMS" | "PUSH" | "IN_APP";

export type NotificationDeliveryStatus =
  | "PENDING"
  | "PROCESSING"
  | "SENT"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED";

export interface NotificationItem {
  id: string;
  userId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  type: string;
  channel: NotificationChannel;
  subject: string;
  content?: string;
  templateName?: string;
  status: NotificationDeliveryStatus;
  readStatus: NotificationReadStatus;
  readAt?: string;
  sentAt?: string;
  deliveryAttempts?: number;
  errorMessage?: string;
  externalId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationListResponse {
  notifications: NotificationItem[];
  currentPage: number;
  totalItems: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export interface NotificationUnreadCountResponse {
  userId: string;
  unreadCount: number;
}
