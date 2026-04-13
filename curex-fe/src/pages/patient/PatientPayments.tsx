import { useEffect, useMemo, useState } from "react";
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

function paymentStatusRank(status: string | undefined): number {
  const normalized = String(status ?? "").toUpperCase();
  if (normalized === "SUCCESS" || normalized === "COMPLETED") {
    return 3;
  }
  if (normalized === "PENDING") {
    return 2;
  }
  if (normalized === "FAILED" || normalized === "CANCELLED") {
    return 1;
  }
  return 0;
}

export function PatientPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const latestPayments = useMemo(() => {
    const byAppointment = new Map<string, PaymentRecord>();

    for (const payment of payments) {
      const key = String(payment.appointmentId || payment.id);
      const existing = byAppointment.get(key);
      if (!existing) {
        byAppointment.set(key, payment);
        continue;
      }

      const existingRank = paymentStatusRank(existing.status);
      const currentRank = paymentStatusRank(payment.status);
      if (currentRank > existingRank) {
        byAppointment.set(key, payment);
        continue;
      }
      if (currentRank < existingRank) {
        continue;
      }

      const currentTs = new Date(payment.updatedAt || payment.createdAt).getTime();
      const existingTs = new Date(existing.updatedAt || existing.createdAt).getTime();
      if (currentTs >= existingTs) {
        byAppointment.set(key, payment);
      }
    }

    return [...byAppointment.values()].sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime(),
    );
  }, [payments]);

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
        setError("Failed to load payment history. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    loadPayments();
  }, [user?.id]);

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case "SUCCESS":
      case "COMPLETED":
        return <CheckCircle2 className="h-4 w-4" />;
      case "PENDING":
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status.toUpperCase()) {
      case "SUCCESS":
      case "COMPLETED":
        return "bg-accent-mint/10 text-accent-mint border-accent-mint/20 shadow-sm shadow-accent-mint/5";
      case "PENDING":
        return "bg-accent-sky/10 text-accent-sky border-accent-sky/20 shadow-sm shadow-accent-sky/5";
      case "CANCELLED":
        return "bg-error/10 text-error border-error/20 shadow-sm shadow-error/5";
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
      setDetailsError("Could not refresh latest transaction state.");
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Payments & Billing</h1>
          <p className="text-text-secondary mt-1">
            Manage your invoices, track transaction history, and view receipts.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-96 flex-col items-center justify-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary shadow-lg shadow-primary/5"></div>
          <p className="text-sm font-medium text-text-secondary animate-pulse">Syncing transactions...</p>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-error/20 bg-error/5 p-8 text-center animate-in shake-1">
          <AlertCircle className="h-10 w-10 text-error mx-auto mb-4 opacity-50" />
          <p className="text-primary font-semibold">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-bold hover:bg-primary/20 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      ) : latestPayments.length === 0 ? (
        <div className="patient-card p-20 flex flex-col items-center justify-center text-center bg-background/30 border-dashed border-2 border-text-secondary/10 rounded-3xl">
          <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-6">
            <CreditCard className="h-10 w-10 text-text-secondary/30" strokeWidth={1} />
          </div>
          <h4 className="text-lg font-bold text-primary mb-2">No transactions yet</h4>
          <p className="text-sm text-text-secondary max-w-xs mx-auto mb-6">
            You haven't made any payments yet. Completed appointment bookings will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-surface rounded-3xl border border-text-secondary/5 overflow-hidden shadow-xl shadow-primary/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-text-secondary/10 bg-primary/5">
                  <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-[0.1em] text-text-secondary">
                    Transaction Date
                  </th>
                  <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-[0.1em] text-text-secondary">
                    Reference
                  </th>
                  <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-[0.1em] text-text-secondary">
                    Total Amount
                  </th>
                  <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-[0.1em] text-text-secondary">
                    Current Status
                  </th>
                  <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-[0.1em] text-text-secondary text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-text-secondary/5">
                {latestPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="hover:bg-primary/5 transition-colors duration-300 group"
                  >
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-primary">
                          {new Date(payment.createdAt ?? Date.now()).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-[10px] text-text-secondary/60 font-medium">
                          {new Date(payment.createdAt ?? Date.now()).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-text-secondary bg-background px-2 py-0.5 rounded border border-text-secondary/10">
                          #{String(payment.appointmentId ?? payment.id).substring(0, 8)}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm font-black text-primary tracking-tight">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: payment.currency,
                        }).format(payment.amount)}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black tracking-wider uppercase transition-all group-hover:scale-105 duration-300 ${getStatusClass(payment.status)}`}
                      >
                        {getStatusIcon(payment.status)}
                        {payment.status}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button
                        type="button"
                        onClick={() => openPaymentDetails(payment)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 text-primary hover:bg-primary text-xs font-bold rounded-xl transition-all duration-300 hover:text-white hover:shadow-lg hover:shadow-primary/20"
                      >
                        View Details <ExternalLink size={14} />
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
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-text-primary/40 p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div
            className="w-full max-w-xl rounded-[32px] bg-surface p-8 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-8 duration-500"
            style={{ boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}
          >
            <div className="flex items-start justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-text-primary">Payment Details</h2>
                  <p className="text-[10px] uppercase font-bold text-text-secondary/40 tracking-[0.2em] mt-1">Transaction Receipt</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closePaymentDetails}
                className="rounded-2xl border border-text-secondary/10 p-3 text-text-secondary transition hover:bg-error/5 hover:text-error hover:border-error/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              {detailsLoading ? (
                <div className="flex flex-col items-center py-12 space-y-4">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/10 border-t-primary"></div>
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-[0.2em]">Authenticating...</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  <DetailRow label="Appointment Reference" value={selectedPayment.appointmentId} mono isCopyable />
                  <DetailRow label="Billing Amount" value={new Intl.NumberFormat("en-US", { style: "currency", currency: selectedPayment.currency || "USD" }).format(selectedPayment.amount)} highlight />
                  <DetailRow 
                    label="Transaction Status" 
                    customValue={(
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase ${getStatusClass(selectedPayment.status)}`}>
                        {getStatusIcon(selectedPayment.status)}
                        {selectedPayment.status}
                      </div>
                    )} 
                  />
                  <DetailRow label="Payment Method" value={selectedPayment.paymentMethod || "Direct Payment"} />
                  <div className="h-px bg-text-secondary/5 my-2" />
                  <DetailRow label="Initiated At" value={new Date(selectedPayment.createdAt).toLocaleString("en-GB", { dateStyle: 'medium', timeStyle: 'short' })} />
                  <DetailRow label="Last Activity" value={new Date(selectedPayment.updatedAt).toLocaleString("en-GB", { dateStyle: 'medium', timeStyle: 'short' })} />
                </div>
              )}

              {detailsError && (
                <div className="rounded-2xl border border-error/20 bg-error/5 p-4 flex items-center gap-3 animate-in shake-1">
                  <AlertCircle className="h-5 w-5 text-error shrink-0" />
                  <p className="text-xs font-medium text-error">{detailsError}</p>
                </div>
              )}
              
              <button
                onClick={closePaymentDetails}
                className="w-full py-4 bg-text-primary text-white rounded-2xl font-bold tracking-tight shadow-xl shadow-text-primary/10 hover:bg-primary transition-all duration-300 mt-6"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono, highlight, isCopyable, customValue }: { 
  label: string, 
  value?: string | number, 
  mono?: boolean, 
  highlight?: boolean,
  isCopyable?: boolean,
  customValue?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between group py-1">
      <span className="text-xs font-semibold text-text-secondary/70">{label}</span>
      {customValue ? customValue : (
        <span className={`text-sm ${mono ? 'font-mono' : 'font-bold'} ${highlight ? 'text-primary' : 'text-primary/90'} transition-all`}>
          {value}
        </span>
      )}
    </div>
  );
}

