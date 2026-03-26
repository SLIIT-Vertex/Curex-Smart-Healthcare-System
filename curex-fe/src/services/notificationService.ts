import api from "./axiosInstance";
import type {
  NotificationListResponse,
  NotificationReadStatus,
  NotificationUnreadCountResponse,
} from "../types/notification";

const NOTIFICATIONS = "/api/notifications";

interface GetUserNotificationsParams {
  page?: number;
  size?: number;
  readStatus?: NotificationReadStatus;
}

export const notificationService = {
  getUserNotifications(
    userId: string,
    params: GetUserNotificationsParams = {},
  ): Promise<NotificationListResponse> {
    return api
      .get<NotificationListResponse>(`${NOTIFICATIONS}/user/${userId}`, {
        params,
      })
      .then((r) => r.data);
  },

  getUnreadCount(userId: string): Promise<NotificationUnreadCountResponse> {
    return api
      .get<NotificationUnreadCountResponse>(
        `${NOTIFICATIONS}/user/${userId}/unread-count`,
      )
      .then((r) => r.data);
  },

  markAsRead(userId: string, notificationId: string): Promise<void> {
    return api
      .put(`${NOTIFICATIONS}/user/${userId}/${notificationId}/read`)
      .then(() => undefined);
  },

  markAllAsRead(userId: string): Promise<{ updatedCount: number }> {
    return api
      .put<{ updatedCount: number }>(`${NOTIFICATIONS}/user/${userId}/read-all`)
      .then((r) => r.data);
  },
};
