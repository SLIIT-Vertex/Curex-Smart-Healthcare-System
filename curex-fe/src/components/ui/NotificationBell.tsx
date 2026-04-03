import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Pill,
  CalendarCheck,
  CreditCard,
  ShieldAlert,
  BellRing,
  Ban,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNotifications } from "../../hooks/useNotifications";
import type { NotificationItem } from "../../types/notification";

interface NotificationBellProps {
  buttonClassName: string;
}

function parseNotificationTime(value: string): Date {
  // Backend may return ISO without timezone (LocalDateTime). Treat it as UTC.
  const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value);
  const normalized = hasTimezone ? value : `${value}Z`;
  return new Date(normalized);
}

function relativeTime(value: string): string {
  const now = Date.now();
  const then = parseNotificationTime(value).getTime();
  const diffMs = Math.max(0, now - then);
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;

  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;

  return parseNotificationTime(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

function localDateTime(value: string): string {
  return parseNotificationTime(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface NotificationTypeStyle {
  icon: LucideIcon;
  bg: string;
  color: string;
}

function getNotificationTypeStyle(type: string): NotificationTypeStyle {
  const upper = type.toUpperCase();
  if (upper === "PRESCRIPTION_CANCELLED") {
    return { icon: Ban, bg: "bg-error/12", color: "text-error" };
  }
  if (upper.startsWith("PRESCRIPTION_")) {
    return { icon: Pill, bg: "bg-accent-mint/15", color: "text-emerald-600" };
  }
  if (upper.startsWith("APPOINTMENT_")) {
    return { icon: CalendarCheck, bg: "bg-accent-sky/15", color: "text-sky-600" };
  }
  if (upper.startsWith("PAYMENT_")) {
    return { icon: CreditCard, bg: "bg-accent-peach/15", color: "text-amber-600" };
  }
  if (upper === "PASSWORD_RESET" || upper === "SYSTEM_ALERT") {
    return { icon: ShieldAlert, bg: "bg-error/10", color: "text-red-500" };
  }
  return { icon: BellRing, bg: "bg-primary-light/10", color: "text-primary-light" };
}

function NotificationRow({
  item,
  onMarkRead,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
}: {
  item: NotificationItem;
  onMarkRead: (id: string) => void;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
}) {
  const style = getNotificationTypeStyle(item.type);
  const TypeIcon = style.icon;

  return (
    <div
      className={`relative rounded-xl border px-3 py-2.5 ${
        item.readStatus === "UNREAD"
          ? "border-primary-light/30 bg-primary-light/5"
          : "border-text-secondary/10 bg-surface"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.bg}`}
        >
          <TypeIcon
            className={`h-4 w-4 ${style.color}`}
            strokeWidth={1.5}
            aria-hidden
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-primary truncate">
            {item.subject}
          </p>
          <p className="mt-0.5 text-xs text-text-secondary line-clamp-2">
            {item.content || `${item.type} notification`}
          </p>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-text-secondary">
            <span>{relativeTime(item.createdAt)}</span>
            <span className="h-1 w-1 rounded-full bg-text-secondary/50" />
            <span>{localDateTime(item.createdAt)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleMenu}
          className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-primary-light/10 hover:text-primary"
          aria-label="Notification actions"
        >
          <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      {menuOpen && (
        <div className="absolute right-2 top-10 z-10 w-40 rounded-lg border border-text-secondary/15 bg-surface p-1 shadow-card">
          <button
            type="button"
            disabled={item.readStatus === "READ"}
            onClick={() => {
              onMarkRead(item.id);
              onCloseMenu();
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-primary transition hover:bg-primary-light/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={1.75} />
            Mark as read
          </button>
        </div>
      )}
    </div>
  );
}

export function NotificationBell({ buttonClassName }: NotificationBellProps) {
  const {
    loading,
    notifications,
    unreadCount,
    filter,
    setFilter,
    refresh,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [open, setOpen] = useState(false);
  const [menuForId, setMenuForId] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);

  const badgeLabel = useMemo(
    () => (unreadCount > 99 ? "99+" : String(unreadCount)),
    [unreadCount],
  );

  useEffect(() => {
    if (!open) return;

    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
        setMenuForId(null);
      }
    };

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setMenuForId(null);
      }
    };

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={buttonClassName}
        aria-label="Notifications"
        onClick={() => {
          setOpen((prev) => !prev);
          setMenuForId(null);
        }}
      >
        <Bell className="h-5 w-5" strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-error px-1.5 py-0.5 text-[10px] font-bold text-surface">
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-180 w-[24rem] max-w-[calc(100vw-1rem)] rounded-2xl border border-text-secondary/15 bg-surface p-3 shadow-card">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-primary">Notifications</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void refresh()}
                className="rounded-md p-1.5 text-text-secondary transition hover:bg-primary-light/10 hover:text-primary"
                aria-label="Refresh notifications"
              >
                <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={() => void markAllAsRead()}
                disabled={unreadCount === 0}
                className="inline-flex items-center gap-1 rounded-md border border-text-secondary/20 px-2 py-1 text-xs font-medium text-primary transition hover:bg-primary-light/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
                Mark all read
              </button>
            </div>
          </div>

          <div className="mb-2 inline-flex rounded-lg border border-text-secondary/15 bg-background/30 p-1">
            <button
              type="button"
              onClick={() => setFilter("ALL")}
              className={`rounded-md px-2 py-1 text-xs font-medium ${
                filter === "ALL"
                  ? "bg-primary-light/15 text-primary"
                  : "text-text-secondary"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter("UNREAD")}
              className={`rounded-md px-2 py-1 text-xs font-medium ${
                filter === "UNREAD"
                  ? "bg-primary-light/15 text-primary"
                  : "text-text-secondary"
              }`}
            >
              Unread
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8 text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-text-secondary/20 bg-background/30 px-3 py-8 text-center text-sm text-text-secondary">
              No notifications found.
            </div>
          ) : (
            <div className="max-h-[24rem] space-y-2 overflow-y-auto pr-1">
              {notifications.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  menuOpen={menuForId === item.id}
                  onToggleMenu={() =>
                    setMenuForId((prev) => (prev === item.id ? null : item.id))
                  }
                  onCloseMenu={() => setMenuForId(null)}
                  onMarkRead={(id) => void markAsRead(id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
