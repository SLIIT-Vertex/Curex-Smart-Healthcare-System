import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "../../../store/hooks";
import { NotificationBell } from "../../ui/NotificationBell";
import { ThemeToggle } from "../common/ThemeToggle";
import { SystemClock } from "../common/SystemClock";

interface AdminTopBarProps {
  onMenuClick: () => void;
}

export function AdminTopBar({ onMenuClick }: AdminTopBarProps) {
  const { user } = useAuth();

  return (
    <header className="relative z-120 flex h-16 shrink-0 items-center justify-between border-b border-text-secondary/10 bg-surface/95 px-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        aria-label="Open sidebar"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-primary-light/5 hover:text-primary lg:hidden"
      >
        <Menu className="h-5 w-5" strokeWidth={1.5} />
      </button>

      <p className="hidden text-sm font-medium text-text-secondary lg:block">
        Platform Administration
      </p>

      <div className="flex items-center gap-3">
        <SystemClock />
        <ThemeToggle />
        <NotificationBell buttonClassName="relative rounded-lg p-2 text-text-secondary transition-colors hover:bg-primary-light/5 hover:text-primary" />

        <Link
          to="/admin/profile"
          className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-all duration-200 hover:bg-primary-light/5"
          aria-label="Go to profile"
        >
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-semibold text-surface">
            {user?.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              (user?.firstName?.[0] ?? "A")
            )}
          </div>
          <div className="hidden flex-col sm:flex">
            <span className="text-sm font-medium text-primary leading-tight">
              {user ? `${user.firstName} ${user.lastName}` : "Admin"}
            </span>
            <span className="text-xs text-text-secondary">Admin</span>
          </div>
        </Link>
      </div>
    </header>
  );
}
