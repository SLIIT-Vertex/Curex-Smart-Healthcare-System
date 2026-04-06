import { useEffect, useState } from "react";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  X,
} from "lucide-react";
import {
  getPatientPayments,
  getPaymentDetails,
} from "../../services/paymentService";
import type { PaymentRecord } from "../../services/paymentService";
import { useAuth } from "../../store/hooks";

export function PatientPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPayments() {
      try {
        setLoading(true);
        if (!user?.id) {
          setPayments([]);
          return;
        }
        const data = await getPatientPayments(user.id);
        setPayments(Array.isArray(data) ? data : []);
      } catch {
        setError("Failed to load payment history.");
      } finally {
        setLoading(false);
      }
    }
    loadPayments();
  }, [user?.id]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SUCCESS":
      case "COMPLETED":
        return <CheckCircle2 className="h-4 w-4 text-accent-mint" />;
      case "PENDING":
        return <Clock className="h-4 w-4 text-accent-sky" />;
      default:
        return <AlertCircle className="h-4 w-4 text-error" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "SUCCESS":
      case "COMPLETED":
        return "bg-accent-mint/10 text-accent-mint border-accent-mint/20";
      case "PENDING":
        return "bg-accent-sky/10 text-accent-sky border-accent-sky/20";
      case "CANCELLED":
        return "bg-error/10 text-error border-error/20";
      default:
        return "bg-text-secondary/10 text-text-secondary border-text-secondary/20";
    }
  };

  const openPaymentDetails = async (payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setDetailsLoading(true);
    setDetailsError(null);

    try {
      const latest = await getPaymentDetails(payment.id);
      setSelectedPayment(latest);
    } catch {
      setDetailsError("Could not load latest payment details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const closePaymentDetails = () => {
    setSelectedPayment(null);
    setDetailsError(null);
    setDetailsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-heading">Payments & Billing</h1>
        <p className="section-subtext mt-1">
          Review your transaction history and payment status.
        </p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-error/20 bg-error/5 p-6 text-center text-primary">
          {error}
        </div>
      ) : payments.length === 0 ? (
        <div className="patient-card patient-empty-state">
          <CreditCard className="h-12 w-12 text-text-secondary/30 mb-3" />
          <p className="text-text-secondary">No payment records found.</p>
        </div>
      ) : (
        <div className="appointment-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-text-secondary/10 bg-background/50">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Date
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Appointment ID
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-text-secondary/10">
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="hover:bg-primary-light/5 transition"
                  >
                    <td className="px-6 py-4 text-sm text-primary whitespace-nowrap">
                      {new Date(payment.createdAt ?? Date.now()).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary font-mono">
                      {String(payment.appointmentId ?? "-").substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-primary">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: payment.currency,
                      }).format(payment.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${getStatusClass(payment.status)}`}
                      >
                        {getStatusIcon(payment.status)}
                        {payment.status}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => openPaymentDetails(payment)}
                        className="text-primary hover:text-primary-light flex items-center gap-1 text-xs font-medium transition"
                      >
                        View Details <ExternalLink size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/30 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-2xl bg-surface p-5"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-primary">Payment Details</h2>
                <p className="text-sm text-text-secondary">Reference: {selectedPayment.id}</p>
              </div>
              <button
                type="button"
                onClick={closePaymentDetails}
                className="rounded-lg border border-text-secondary/20 p-2 text-text-secondary transition hover:text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              {detailsLoading ? (
                <div className="flex items-center gap-2 text-text-secondary">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  Loading latest details...
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Appointment ID</span>
                    <span className="font-medium text-primary">{selectedPayment.appointmentId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Patient ID</span>
                    <span className="font-medium text-primary">{selectedPayment.patientId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Amount</span>
                    <span className="font-medium text-primary">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: selectedPayment.currency || "USD",
                      }).format(selectedPayment.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Status</span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${getStatusClass(selectedPayment.status)}`}
                    >
                      {getStatusIcon(selectedPayment.status)}
                      {selectedPayment.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Method</span>
                    <span className="font-medium text-primary">{selectedPayment.paymentMethod || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Created</span>
                    <span className="font-medium text-primary">
                      {new Date(selectedPayment.createdAt).toLocaleString("en-GB")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Updated</span>
                    <span className="font-medium text-primary">
                      {new Date(selectedPayment.updatedAt).toLocaleString("en-GB")}
                    </span>
                  </div>
                  {selectedPayment.stripeSessionId && (
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary">Stripe Session</span>
                      <span className="font-mono text-xs text-primary">{selectedPayment.stripeSessionId}</span>
                    </div>
                  )}
                  {selectedPayment.stripePaymentIntentId && (
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary">Payment Intent</span>
                      <span className="font-mono text-xs text-primary">{selectedPayment.stripePaymentIntentId}</span>
                    </div>
                  )}
                </>
              )}

              {detailsError && (
                <p className="rounded-lg border border-error/20 bg-error/5 px-3 py-2 text-xs text-error">
                  {detailsError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
