import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Clock3,
  Search,
  TriangleAlert,
} from "lucide-react";
import { isAxiosError } from "axios";
import { getAdminAppointments } from "../../services/appointmentService";
import {
  confirmPayment,
  getAdminPayments,
  getPatientPayments,
  getPaymentDetails,
} from "../../services/paymentService";
import type { PaymentRecord } from "../../services/paymentService";
import { useToast } from "../../store/hooks";

type PaymentStatusFilter =
  | "ALL"
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "COMPLETED";

const STATUS_OPTIONS: PaymentStatusFilter[] = [
  "ALL",
  "PENDING",
  "SUCCESS",
  "FAILED",
  "CANCELLED",
  "COMPLETED",
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

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function statusBadge(status: string): string {
  if (status === "SUCCESS" || status === "COMPLETED") {
    return "bg-status-healthy/15 text-status-healthy";
  }
  if (status === "PENDING")
    return "bg-status-attention/15 text-status-attention";
  if (status === "FAILED") return "bg-error/15 text-error";
  if (status === "CANCELLED") return "bg-text-secondary/15 text-text-secondary";
  return "bg-primary-light/15 text-primary";
}

async function loadPaymentsFromExistingEndpoints(): Promise<PaymentRecord[]> {
  const appointments = await getAdminAppointments();
  const paymentIds = Array.from(
    new Set(
      appointments.map((appointment) => appointment.paymentId).filter(Boolean),
    ),
  ) as string[];

  if (paymentIds.length > 0) {
    const settled = await Promise.allSettled(
      paymentIds.map((id) => getPaymentDetails(id)),
    );
    return settled
      .filter(
        (result): result is PromiseFulfilledResult<PaymentRecord> =>
          result.status === "fulfilled",
      )
      .map((result) => result.value);
  }

  const uniquePatientIds = Array.from(
    new Set(
      appointments.map((appointment) => appointment.patientId).filter(Boolean),
    ),
  ) as string[];

  const byPatient = await Promise.allSettled(
    uniquePatientIds
      .slice(0, 50)
      .map((patientId) => getPatientPayments(patientId)),
  );

  const merged = byPatient
    .filter(
      (result): result is PromiseFulfilledResult<PaymentRecord[]> =>
        result.status === "fulfilled",
    )
    .flatMap((result) => result.value);

  const seen = new Set<string>();
  return merged.filter((payment) => {
    if (!payment.id || seen.has(payment.id)) return false;
    seen.add(payment.id);
    return true;
  });
}

export function AdminPayments() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>("ALL");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const adminPayments = await getAdminPayments();
        if (mounted) {
          setPayments(adminPayments);
          setLoading(false);
        }
      } catch (error) {
        const status = isAxiosError(error) ? error.response?.status : undefined;
        const canFallback = status === 404 || status === 405 || status === 501;

        if (!canFallback) {
          toast("Failed to load admin payments.", "error");
          if (mounted) setLoading(false);
          return;
        }

        try {
          const fallbackPayments = await loadPaymentsFromExistingEndpoints();
          if (mounted) {
            setPayments(fallbackPayments);
            toast(
              "Using fallback payment data until admin payment endpoints are available.",
              "info",
            );
          }
        } catch {
          toast("Failed to load fallback payment data.", "error");
        } finally {
          if (mounted) setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [toast]);

  const filteredPayments = useMemo(() => {
    const term = search.trim().toLowerCase();

    return payments.filter((payment) => {
      if (statusFilter !== "ALL" && payment.status !== statusFilter)
        return false;
      if (!term) return true;

      const haystack = [
        payment.id,
        payment.appointmentId,
        payment.patientId,
        payment.paymentMethod,
        payment.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [payments, search, statusFilter]);

  const kpis = useMemo(() => {
    const total = payments.length;
    const pending = payments.filter(
      (payment) => payment.status === "PENDING",
    ).length;
    const success = payments.filter(
      (payment) =>
        payment.status === "SUCCESS" || payment.status === "COMPLETED",
    ).length;
    const failed = payments.filter(
      (payment) => payment.status === "FAILED",
    ).length;
    const totalCollected = payments
      .filter(
        (payment) =>
          payment.status === "SUCCESS" || payment.status === "COMPLETED",
      )
      .reduce((sum, payment) => sum + payment.amount, 0);

    return {
      total,
      pending,
      success,
      failed,
      totalCollected,
    };
  }, [payments]);

  const handleConfirm = async (paymentId: string) => {
    try {
      setConfirmingId(paymentId);
      const updated = await confirmPayment(paymentId);
      setPayments((prev) =>
        prev.map((item) =>
          item.id === updated.id ? { ...item, ...updated } : item,
        ),
      );
      toast("Payment confirmed successfully.", "success");
    } catch {
      toast("Could not confirm payment.", "error");
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-primary">
          Payments
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Track transactions and resolve payment exceptions.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div
          className="rounded-2xl bg-surface p-4"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-2 text-text-secondary">
            <Banknote className="h-4 w-4" strokeWidth={1.75} />
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
          <div className="flex items-center gap-2 text-status-healthy">
            <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
            <span className="text-xs uppercase tracking-wider">Success</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-primary">
            {kpis.success}
          </p>
        </div>
        <div
          className="rounded-2xl bg-surface p-4"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-2 text-error">
            <TriangleAlert className="h-4 w-4" strokeWidth={1.75} />
            <span className="text-xs uppercase tracking-wider">Failed</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-primary">
            {kpis.failed}
          </p>
        </div>
        <div
          className="rounded-2xl bg-surface p-4"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-2 text-primary-light">
            <Banknote className="h-4 w-4" strokeWidth={1.75} />
            <span className="text-xs uppercase tracking-wider">Collected</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-primary">
            {formatMoney(kpis.totalCollected, "USD")}
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
              placeholder="Search by payment, appointment, patient..."
              className="h-11 w-full rounded-xl border border-text-secondary/20 bg-background pl-9 pr-3 text-sm text-primary outline-none ring-0 transition-colors focus:border-primary"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as PaymentStatusFilter)
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
                  Payment
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-text-secondary">
                  Appointment
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-text-secondary">
                  Patient
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-text-secondary">
                  Amount
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-text-secondary">
                  Status
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-text-secondary">
                  Created
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
                    Loading payments...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-text-secondary"
                  >
                    No payment records found for selected filters.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => {
                  const canConfirm =
                    payment.status === "PENDING" || payment.status === "FAILED";
                  return (
                    <tr key={payment.id} className="hover:bg-primary-light/5">
                      <td className="px-4 py-3 text-sm font-medium text-primary">
                        {payment.id}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {payment.appointmentId}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {payment.patientId}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-primary">
                        {formatMoney(payment.amount, payment.currency || "USD")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(payment.status)}`}
                        >
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {formatDateTime(payment.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={!canConfirm || confirmingId === payment.id}
                          onClick={() => handleConfirm(payment.id)}
                          className="rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary-light/10 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {confirmingId === payment.id
                            ? "Confirming..."
                            : "Confirm"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
