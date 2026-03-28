import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Search,
  XCircle,
} from "lucide-react";
import {
  adminCancelAppointment,
  getAdminAppointments,
} from "../../services/appointmentService";
import type {
  AppointmentRecord,
  AppointmentStatus,
} from "../../types/appointment";
import { useToast } from "../../store/hooks";

const STATUS_OPTIONS: Array<AppointmentStatus | "ALL"> = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "IN_SESSION",
  "COMPLETED",
  "CANCELLED",
];

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: AppointmentStatus): string {
  if (status === "COMPLETED") return "bg-status-healthy/15 text-status-healthy";
  if (status === "CANCELLED") return "bg-error/15 text-error";
  if (status === "PENDING")
    return "bg-status-attention/15 text-status-attention";
  if (status === "CONFIRMED") return "bg-status-info/15 text-status-info";
  return "bg-primary-light/15 text-primary";
}

export function AdminAppointments() {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "ALL">(
    "ALL",
  );
  const [search, setSearch] = useState("");
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentRecord | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getAdminAppointments()
      .then((data) => {
        if (!mounted) return;
        setAppointments(data);
      })
      .catch(() => {
        toast("Failed to load admin appointments.", "error");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [toast]);

  const filteredAppointments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return appointments.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (!term) return true;

      const haystack = [
        item.id,
        item.patientName,
        item.patientEmail,
        item.doctorName,
        item.doctorSpecialty,
        item.patientId,
        item.doctorId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [appointments, search, statusFilter]);

  const kpis = useMemo(() => {
    const total = appointments.length;
    const pending = appointments.filter(
      (item) => item.status === "PENDING",
    ).length;
    const confirmed = appointments.filter(
      (item) => item.status === "CONFIRMED",
    ).length;
    const completed = appointments.filter(
      (item) => item.status === "COMPLETED",
    ).length;
    const cancelled = appointments.filter(
      (item) => item.status === "CANCELLED",
    ).length;
    return { total, pending, confirmed, completed, cancelled };
  }, [appointments]);

  const closeCancelModal = () => {
    setSelectedAppointment(null);
    setCancelReason("");
    setCancelLoading(false);
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;
    const reason = cancelReason.trim();
    if (!reason) {
      toast("Cancellation reason is required.", "warning");
      return;
    }

    try {
      setCancelLoading(true);
      const updated = await adminCancelAppointment(
        selectedAppointment.id,
        reason,
      );
      setAppointments((prev) =>
        prev.map((item) =>
          item.id === updated.id ? { ...item, ...updated } : item,
        ),
      );
      toast("Appointment cancelled successfully.", "success");
      closeCancelModal();
    } catch {
      toast("Failed to cancel appointment. Please try again.", "error");
      setCancelLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-primary">
          Appointments
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Monitor and manage all platform appointments.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div
          className="rounded-2xl bg-surface p-4"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-2 text-text-secondary">
            <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
            <span className="text-xs uppercase tracking-wider">Total</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-primary">
            {kpis.total}
          </p>
        </div>
        <div
          className="rounded-2xl bg-surface p-4"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-2 text-status-attention">
            <Clock3 className="h-4 w-4" strokeWidth={1.75} />
            <span className="text-xs uppercase tracking-wider">Pending</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-primary">
            {kpis.pending}
          </p>
        </div>
        <div
          className="rounded-2xl bg-surface p-4"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-2 text-status-info">
            <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
            <span className="text-xs uppercase tracking-wider">Confirmed</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-primary">
            {kpis.confirmed}
          </p>
        </div>
        <div
          className="rounded-2xl bg-surface p-4"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-2 text-status-healthy">
            <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
            <span className="text-xs uppercase tracking-wider">Completed</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-primary">
            {kpis.completed}
          </p>
        </div>
        <div
          className="rounded-2xl bg-surface p-4"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-2 text-error">
            <XCircle className="h-4 w-4" strokeWidth={1.75} />
            <span className="text-xs uppercase tracking-wider">Cancelled</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-primary">
            {kpis.cancelled}
          </p>
        </div>
      </div>

      <div
        className="rounded-2xl bg-surface p-4"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by appointment, patient, doctor..."
              className="h-11 w-full rounded-xl border border-text-secondary/20 bg-background pl-9 pr-3 text-sm text-primary outline-none ring-0 transition-colors focus:border-primary"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as AppointmentStatus | "ALL")
            }
            className="h-11 rounded-xl border border-text-secondary/20 bg-background px-3 text-sm text-primary outline-none transition-colors focus:border-primary"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className="rounded-2xl bg-surface"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-text-secondary/10 bg-background/40">
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-text-secondary">
                  Appointment
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-text-secondary">
                  Patient
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-text-secondary">
                  Doctor
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-text-secondary">
                  Time
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-text-secondary">
                  Type
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-text-secondary">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-text-secondary">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-text-secondary/10">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-text-secondary"
                  >
                    Loading appointments...
                  </td>
                </tr>
              ) : filteredAppointments.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-text-secondary"
                  >
                    No appointments found for selected filters.
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-primary-light/5">
                    <td className="px-4 py-3 text-sm font-medium text-primary">
                      {appointment.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      <p className="font-medium text-primary">
                        {appointment.patientName ?? appointment.patientId}
                      </p>
                      <p className="text-xs">
                        {appointment.patientEmail ?? "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      <p className="font-medium text-primary">
                        {appointment.doctorName ?? appointment.doctorId}
                      </p>
                      <p className="text-xs">
                        {appointment.doctorSpecialty ?? "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {formatDateTime(appointment.appointmentTime)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {appointment.type}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(appointment.status)}`}
                      >
                        {appointment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={
                          appointment.status === "CANCELLED" ||
                          appointment.status === "COMPLETED"
                        }
                        onClick={() => setSelectedAppointment(appointment)}
                        className="rounded-lg border border-error/30 px-3 py-1.5 text-xs font-medium text-error transition-colors hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedAppointment && (
        <div className="fixed inset-0 z-150 flex items-center justify-center bg-primary/20 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-2xl border border-text-secondary/10 bg-surface p-5"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <h2 className="text-lg font-semibold text-primary">
              Cancel appointment
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Appointment: {selectedAppointment.id}
            </p>
            <label className="mt-4 block text-sm font-medium text-primary">
              Cancellation reason
              <textarea
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                rows={4}
                className="mt-2 w-full resize-none rounded-xl border border-text-secondary/20 bg-background px-3 py-2 text-sm text-primary outline-none transition-colors focus:border-primary"
                placeholder="Explain why this appointment is being cancelled"
              />
            </label>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeCancelModal}
                disabled={cancelLoading}
                className="rounded-lg border border-text-secondary/20 px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-background disabled:opacity-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleCancelAppointment}
                disabled={cancelLoading}
                className="rounded-lg bg-error px-3 py-2 text-sm font-medium text-surface transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                {cancelLoading ? "Cancelling..." : "Confirm cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
