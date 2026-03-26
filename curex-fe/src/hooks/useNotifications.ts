import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, useToast } from "../store/hooks";
import { notificationService } from "../services/notificationService";
import type {
  NotificationChannel,
  NotificationItem,
  NotificationReadStatus,
} from "../types/notification";

export type NotificationFilter = "ALL" | NotificationReadStatus;

const POLL_INTERVAL_MS = 30000;
const BELL_CHANNEL: NotificationChannel = "IN_APP";

export function useNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<NotificationFilter>("ALL");

  const userId = user?.id ?? null;

  const refresh = useCallback(
    async (silent = false) => {
      if (!userId) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      if (!silent) {
        setLoading(true);
      }

      try {
        const readStatus = filter === "ALL" ? undefined : filter;
        const listResponse = await notificationService.getUserNotifications(userId, {
          size: 20,
          readStatus,
          channel: BELL_CHANNEL,
        });

        const inAppNotifications = listResponse.notifications.filter(
          (notification) => notification.channel === BELL_CHANNEL,
        );

        setNotifications(inAppNotifications);
        setUnreadCount(
          inAppNotifications.filter((notification) => notification.readStatus === "UNREAD").length,
        );
      } catch {
        if (!silent) {
          toast("Failed to load notifications.", "error");
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [filter, toast, userId],
  );

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!userId) return;

      const target = notifications.find((n) => n.id === notificationId);
      if (!target || target.readStatus === "READ") {
        return;
      }

      try {
        await notificationService.markAsRead(userId, notificationId);

        if (filter === "UNREAD") {
          setNotifications((prev) =>
            prev.filter((n) => n.id !== notificationId),
          );
        } else {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notificationId
                ? { ...n, readStatus: "READ", readAt: new Date().toISOString() }
                : n,
            ),
          );
        }

        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        toast("Failed to mark notification as read.", "error");
      }
    },
    [filter, notifications, toast, userId],
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId || unreadCount === 0) return;

    try {
      await notificationService.markAllAsRead(userId, BELL_CHANNEL);
      setUnreadCount(0);
      setNotifications((prev) => {
        if (filter === "UNREAD") return [];
        const now = new Date().toISOString();
        return prev.map((n) => ({ ...n, readStatus: "READ", readAt: now }));
      });
    } catch {
      toast("Failed to mark all notifications as read.", "error");
    }
  }, [filter, toast, unreadCount, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;

    const timer = window.setInterval(() => {
      void refresh(true);
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [refresh, userId]);

  const hasUnread = useMemo(() => unreadCount > 0, [unreadCount]);

  return {
    loading,
    notifications,
    unreadCount,
    hasUnread,
    filter,
    setFilter,
    refresh,
    markAsRead,
    markAllAsRead,
  };
}
