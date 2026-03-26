import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  KeyRound,
  Loader2,
  MonitorCog,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { authService } from "../../services/authService";
import { getApiErrorMessage } from "../../services/axiosInstance";
import { userService } from "../../services/userService";
import { useAuth, useToast } from "../../store/hooks";
import type { Role } from "../../types/auth";

const INPUT =
  "w-full rounded-xl border border-text-secondary/20 bg-surface px-4 py-2.5 text-sm text-primary placeholder:text-text-secondary focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20";

interface NotificationSettings {
  appointmentReminders: boolean;
  prescriptionAlerts: boolean;
  paymentAlerts: boolean;
  emailDigest: boolean;
}

interface UiPreferences {
  language: "en";
  timeFormat: "12" | "24";
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  appointmentReminders: true,
  prescriptionAlerts: true,
  paymentAlerts: true,
  emailDigest: false,
};

const DEFAULT_UI_PREFERENCES: UiPreferences = {
  language: "en",
  timeFormat: "12",
};

function roleBasePath(role: Role | undefined): string {
  if (role === "ADMIN") return "/admin";
  if (role === "DOCTOR") return "/doctor";
  return "/patient";
}

export function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [savingPassword, setSavingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [notifications, setNotifications] = useState<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS,
  );
  const [preferences, setPreferences] = useState<UiPreferences>(
    DEFAULT_UI_PREFERENCES,
  );

  const basePath = useMemo(() => roleBasePath(user?.role), [user?.role]);
  const settingsStorageKey = useMemo(
    () => `curex-notification-settings-${user?.id ?? "anonymous"}`,
    [user?.id],
  );
  const preferencesStorageKey = useMemo(
    () => `curex-ui-preferences-${user?.id ?? "anonymous"}`,
    [user?.id],
  );
  const notificationPrefsLoadedRef = useRef(false);
  const skipNextNotificationPersistRef = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(settingsStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
      setNotifications((prev) => ({ ...prev, ...parsed }));
    } catch {
      // Ignore malformed local settings and keep defaults.
    }
  }, [settingsStorageKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(preferencesStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<UiPreferences>;
      setPreferences((prev) => ({ ...prev, ...parsed }));
    } catch {
      // Ignore malformed local settings and keep defaults.
    }
  }, [preferencesStorageKey]);

  useEffect(() => {
    if (!user?.id) return;

    let active = true;
    userService
      .getMyNotificationPreferences()
      .then((data) => {
        if (!active) return;
        skipNextNotificationPersistRef.current = true;
        setNotifications({
          appointmentReminders: data.appointmentReminders,
          prescriptionAlerts: data.prescriptionAlerts,
          paymentAlerts: data.paymentAlerts,
          emailDigest: data.emailDigest,
        });
      })
      .catch(() => {
        // Keep local defaults/fallback on fetch failure.
      })
      .finally(() => {
        if (active) {
          notificationPrefsLoadedRef.current = true;
        }
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    localStorage.setItem(settingsStorageKey, JSON.stringify(notifications));
    window.dispatchEvent(new Event("curex:notification-preferences-changed"));

    if (!user?.id || !notificationPrefsLoadedRef.current) {
      return;
    }

    if (skipNextNotificationPersistRef.current) {
      skipNextNotificationPersistRef.current = false;
      return;
    }

    void userService.updateMyNotificationPreferences({
      appointmentReminders: notifications.appointmentReminders,
      prescriptionAlerts: notifications.prescriptionAlerts,
      paymentAlerts: notifications.paymentAlerts,
      emailDigest: notifications.emailDigest,
    });
  }, [notifications, settingsStorageKey]);

  useEffect(() => {
    localStorage.setItem(preferencesStorageKey, JSON.stringify(preferences));
  }, [preferences, preferencesStorageKey]);

  const onSubmitPassword = async (e: FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast("New password must be at least 8 characters", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast("New password and confirm password must match", "error");
      return;
    }

    setSavingPassword(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      toast("Password updated successfully", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast(getApiErrorMessage(err, "Failed to update password"), "error");
    } finally {
      setSavingPassword(false);
    }
  };

  const toggle = (key: keyof NotificationSettings) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
          Settings
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          A shared settings page for admin, doctor, and patient accounts.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          className="rounded-2xl bg-surface p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <SectionTitle
            icon={<KeyRound className="h-4 w-4 text-primary-light" />}
            title="Password & Security"
          />

          <form className="mt-4 space-y-4" onSubmit={onSubmitPassword}>
            <Field label="Current Password">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={INPUT}
                required
                autoComplete="current-password"
              />
            </Field>

            <Field label="New Password">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={INPUT}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </Field>

            <Field label="Confirm New Password">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={INPUT}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </Field>

            <button
              type="submit"
              disabled={savingPassword}
              className="btn-primary"
            >
              {savingPassword ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {savingPassword ? "Updating..." : "Change password"}
            </button>
          </form>
        </section>

        <section
          className="rounded-2xl bg-surface p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <SectionTitle
            icon={<Bell className="h-4 w-4 text-accent-sky" />}
            title="Notification Preferences"
          />
          <p className="mt-2 text-sm text-text-secondary">
            Saved instantly in your browser for now. This is ready to connect to
            backend settings later.
          </p>

          <div className="mt-4 space-y-3">
            <ToggleRow
              label="Appointment reminders"
              description="Get reminded before upcoming appointments"
              checked={notifications.appointmentReminders}
              onToggle={() => toggle("appointmentReminders")}
            />
            <ToggleRow
              label="Prescription alerts"
              description="Know when doctors issue or update prescriptions"
              checked={notifications.prescriptionAlerts}
              onToggle={() => toggle("prescriptionAlerts")}
            />
            <ToggleRow
              label="Payment alerts"
              description="Receive updates about successful and failed payments"
              checked={notifications.paymentAlerts}
              onToggle={() => toggle("paymentAlerts")}
            />
            <ToggleRow
              label="Weekly email digest"
              description="Get a weekly summary of healthcare activities"
              checked={notifications.emailDigest}
              onToggle={() => toggle("emailDigest")}
            />
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          className="rounded-2xl bg-surface p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <SectionTitle
            icon={<MonitorCog className="h-4 w-4 text-accent-peach" />}
            title="Preferences"
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Language">
              <select
                className={INPUT}
                value={preferences.language}
                onChange={(e) =>
                  setPreferences((prev) => ({
                    ...prev,
                    language: e.target.value as UiPreferences["language"],
                  }))
                }
              >
                <option value="en">English</option>
              </select>
            </Field>
            <Field label="Time Format">
              <select
                className={INPUT}
                value={preferences.timeFormat}
                onChange={(e) =>
                  setPreferences((prev) => ({
                    ...prev,
                    timeFormat: e.target.value as UiPreferences["timeFormat"],
                  }))
                }
              >
                <option value="24">24-hour</option>
              </select>
            </Field>
          </div>
          <p className="mt-3 text-xs text-text-secondary">
            These are UI-level settings and can later be synced to your account
            profile.
          </p>
        </section>

        <section
          className="rounded-2xl bg-surface p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <SectionTitle
            icon={<Sparkles className="h-4 w-4 text-accent-mint" />}
            title="Good Next Features"
          />
          <ul className="mt-4 space-y-2 text-sm text-text-secondary">
            <li>Two-factor authentication (OTP on login)</li>
            <li>Session management (view and revoke active devices)</li>
            <li>Privacy controls (hide profile fields per role)</li>
            <li>Export account data and delete account request workflow</li>
            <li>Channel-level notification routing (email, SMS, in-app)</li>
          </ul>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link to={`${basePath}/profile`} className="btn-secondary">
              Open profile
            </Link>
            <Link to={basePath} className="btn-secondary">
              Back to dashboard
            </Link>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-primary-light/20 bg-primary-light/5 p-4 text-sm text-primary">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Security note: password updates are validated on the backend using
            your current password.
          </p>
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-light/10">
        {icon}
      </span>
      <h2 className="text-lg font-semibold text-primary">{title}</h2>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-primary">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-text-secondary/15 bg-background px-4 py-3">
      <div>
        <p className="text-sm font-medium text-primary">{label}</p>
        <p className="text-xs text-text-secondary">{description}</p>
      </div>
      <button
        type="button"
        aria-pressed={checked}
        onClick={onToggle}
        className={`relative h-6 w-11 overflow-hidden rounded-full transition-colors ${
          checked ? "bg-primary-light" : "bg-text-secondary/30"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
