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

interface NotificationSettings {
  appointmentReminders: boolean;
  prescriptionAlerts: boolean;
  paymentAlerts: boolean;
  emailDigest: boolean;
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  appointmentReminders: true,
  prescriptionAlerts: true,
  paymentAlerts: true,
  emailDigest: false,
};

function getNotificationSettings(userId: string): NotificationSettings {
  try {
    const raw = localStorage.getItem(`curex-notification-settings-${userId}`);
    if (!raw) return DEFAULT_NOTIFICATION_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

function isAllowedBySettings(
  notification: NotificationItem,
  settings: NotificationSettings,
): boolean {
  const type = notification.type.toUpperCase();
  const text = `${notification.subject} ${notification.content ?? ""}`.toLowerCase();

  if (!settings.appointmentReminders) {
    if (type.startsWith("APPOINTMENT_") || text.includes("appointment")) {
      return false;
    }
  }

  if (!settings.prescriptionAlerts) {
    if (type.startsWith("PRESCRIPTION_") || text.includes("prescription")) {
      return false;
    }
  }

  if (!settings.paymentAlerts) {
    if (type.startsWith("PAYMENT_") || text.includes("payment")) {
      return false;
    }
  }

  if (!settings.emailDigest) {
    if (text.includes("digest")) {
      return false;
    }
  }

  return true;
}

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
        const settings = getNotificationSettings(userId);
        const listResponse = await notificationService.getUserNotifications(
          userId,
          {
            size: 20,
            readStatus,
            channel: BELL_CHANNEL,
          },
        );

        const inAppNotifications = listResponse.notifications.filter(
          (notification) => notification.channel === BELL_CHANNEL,
        );

        const visibleNotifications = inAppNotifications.filter((notification) =>
          isAllowedBySettings(notification, settings),
        );

        setNotifications(visibleNotifications);
        setUnreadCount(
          visibleNotifications.filter(
            (notification) => notification.readStatus === "UNREAD",
          ).length,
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

  useEffect(() => {
    if (!userId) return;

    const onPreferenceChange = () => {
      void refresh(true);
    };

    window.addEventListener("curex:notification-preferences-changed", onPreferenceChange);
    return () => {
      window.removeEventListener(
        "curex:notification-preferences-changed",
        onPreferenceChange,
      );
    };
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
