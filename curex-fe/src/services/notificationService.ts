import api from "./axiosInstance";
import type {
  NotificationChannel,
  NotificationListResponse,
  NotificationReadStatus,
  NotificationUnreadCountResponse,
} from "../types/notification";

const NOTIFICATIONS = "/api/notifications";

interface GetUserNotificationsParams {
  page?: number;
  size?: number;
  readStatus?: NotificationReadStatus;
  channel?: NotificationChannel;
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

  getUnreadCount(
    userId: string,
    channel?: NotificationChannel,
  ): Promise<NotificationUnreadCountResponse> {
    return api
      .get<NotificationUnreadCountResponse>(
        `${NOTIFICATIONS}/user/${userId}/unread-count`,
        { params: { channel } },
      )
      .then((r) => r.data);
  },

  markAsRead(userId: string, notificationId: string): Promise<void> {
    return api
      .put(`${NOTIFICATIONS}/user/${userId}/${notificationId}/read`)
      .then(() => undefined);
  },

  markAllAsRead(
    userId: string,
    channel?: NotificationChannel,
  ): Promise<{ updatedCount: number }> {
    return api
      .put<{ updatedCount: number }>(
        `${NOTIFICATIONS}/user/${userId}/read-all`,
        undefined,
        {
          params: { channel },
        },
      )
      .then((r) => r.data);
  },
};
