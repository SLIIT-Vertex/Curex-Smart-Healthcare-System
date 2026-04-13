import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, ShieldCheck, X, AlertCircle } from "lucide-react";
import { isAxiosError } from "axios";
import { getAppointmentsByPatient } from "../../services/appointmentService";
import { createCheckoutSession } from "../../services/paymentService";
import type { AppointmentRecord } from "../../types/appointment.ts";
import { useAuth } from "../../store/hooks";

const extractServerMessage = (err: unknown): string | undefined => {
  const maybe = err as {
    response?: { data?: { message?: unknown } };
    message?: unknown;
  };

  const responseMessage = maybe.response?.data?.message;
  if (typeof responseMessage === "string" && responseMessage.trim()) {
    return responseMessage.trim();
  }

  if (typeof maybe.message === "string" && maybe.message.trim()) {
    return maybe.message.trim();
  }

  return undefined;
};

const PENDING_PAYMENT_STORAGE_KEY = 'curex.pendingPayment'

function isRetryableCheckoutError(err: unknown): boolean {
  if (isAxiosError(err)) {
    const status = err.response?.status;
    const serverMessage = String(err.response?.data?.message ?? "").toLowerCase();
    if (status === 405 || status === 502 || status === 503 || status === 504) {
      return true;
    }
    if (serverMessage.includes("request method") && serverMessage.includes("post")) {
      return true;
    }
  }

  const message = extractServerMessage(err)?.toLowerCase() ?? "";
  return message.includes("request method") && message.includes("post");
}

export function PatientCheckout() {
  const { user } = useAuth();
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<AppointmentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("Processing...");
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<"card" | "paypal">("card");
  const paymentRequestInFlightRef = useRef(false);

  useEffect(() => {
    async function loadAppointment() {
      if (!appointmentId || !user?.id) return;
      try {
        setLoading(true);
        const apps = await getAppointmentsByPatient(user.id);
        const found = apps.find((a) => a.id === appointmentId);
        if (found) {
          setAppointment(found);
        } else {
          setError("Appointment record not found in your account.");
        }
      } catch {
        setError("Failed to synchronize appointment details. Please refresh.");
      } finally {
        setLoading(false);
      }
    }
    loadAppointment();
  }, [appointmentId, user?.id]);

  const handlePayment = async () => {
    if (paymentRequestInFlightRef.current || processing) return;
    if (!appointment || !appointmentId || !user?.id) return;

    try {
      paymentRequestInFlightRef.current = true;
      setProcessing(true);
      setProcessingMessage("Establishing secure gateway...");
      setError(null);

      const successUrl = `${window.location.origin}/patient/appointments?payment=success&id=${appointmentId}`;
      const cancelUrl = `${window.location.origin}/patient/checkout/${appointmentId}?payment=cancelled`;

      let session: Awaited<ReturnType<typeof createCheckoutSession>> | null = null;

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          session = await createCheckoutSession(appointmentId, {
            patientId: user.id,
            amount: 50.0, // Standard Consultation Fee
            currency: "usd",
            successUrl,
            cancelUrl,
          });
          break;
        } catch (err) {
          if (attempt < 3 && isRetryableCheckoutError(err)) {
            setProcessingMessage(`Retry attempt ${attempt}...`);
            await new Promise((r) => setTimeout(r, 800 * attempt));
            continue;
          }
          throw err;
        }
      }

      if (!session?.checkoutUrl) {
        throw new Error("Unable to generate checkout session. Please try again.");
      }

      if (session.paymentId) {
        sessionStorage.setItem(
          PENDING_PAYMENT_STORAGE_KEY,
          JSON.stringify({
            paymentId: session.paymentId,
            appointmentId,
            patientId: user.id,
            createdAt: Date.now(),
          }),
        );
      }

      window.location.href = session.checkoutUrl;
    } catch (err: unknown) {
      setError(extractServerMessage(err) ?? "Gateway connection refused. Check your internet.");
    } finally {
      paymentRequestInFlightRef.current = false;
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-6 animate-pulse">
        <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin shadow-xl shadow-primary/10" />
        <p className="text-sm font-bold text-text-secondary uppercase tracking-widest">Securing Connection...</p>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="max-w-xl mx-auto space-y-8 py-10">
        <button
          onClick={() => navigate("/patient/appointments")}
          className="group flex items-center gap-2 text-sm font-bold text-text-secondary hover:text-primary transition-all"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
          Return to Dashboard
        </button>
        <div className="patient-card p-10 border-error/20 bg-error/[0.02] text-center rounded-[32px]">
          <div className="h-16 w-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <X className="h-8 w-8 text-error" />
          </div>
          <h2 className="text-xl font-black text-primary mb-2">Checkout Interrupted</h2>
          <p className="text-text-secondary mb-8">{error || "Access to this check-out session was denied."}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.03] transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const appointmentDate = new Date(appointment.appointmentTime);

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <button
            onClick={() => navigate("/patient/appointments")}
            className="group flex items-center gap-2 text-xs font-black text-text-secondary/60 hover:text-primary uppercase tracking-widest transition-all mb-4"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
            Cancel & Return
          </button>
          <h1 className="text-4xl font-black tracking-tight text-primary">Secure Checkout</h1>
          <p className="text-text-secondary mt-2 max-w-lg">
            Confirm your booking with <span className="text-primary font-bold">Dr. {appointment.doctorName}</span> to finalize your appointment.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-accent-mint/10 px-5 py-3 rounded-2xl border border-accent-mint/20">
          <ShieldCheck className="h-6 w-6 text-accent-mint" />
          <div className="text-xs">
            <p className="font-black text-primary uppercase tracking-wider">End-to-End Encrypted</p>
            <p className="text-text-secondary/70">PCI-DSS Compliant Gateway</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-8">
          <section className="space-y-4">
            <h2 className="text-sm font-black text-primary uppercase tracking-widest opacity-40">Payment Method</h2>
            <div className="grid gap-4">
              <button 
                onClick={() => setSelectedMethod("card")}
                className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all duration-500 ${selectedMethod === "card" ? 'border-primary bg-primary/[0.03] shadow-xl shadow-primary/5' : 'border-text-secondary/5 bg-surface hover:border-primary/20'}`}
              >
                <div className="flex items-center gap-5">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-colors ${selectedMethod === "card" ? 'bg-primary text-white' : 'bg-primary/5 text-primary'}`}>
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-primary tracking-tight">Credit or Debit Card</p>
                    <p className="text-xs text-text-secondary font-medium mt-0.5">Stripe, Visa, Mastercard, AMEX</p>
                  </div>
                </div>
                <div className={`h-6 w-6 rounded-full border-2 transition-all flex items-center justify-center ${selectedMethod === "card" ? 'border-primary' : 'border-text-secondary/20'}`}>
                  {selectedMethod === "card" && <div className="h-3 w-3 rounded-full bg-primary" />}
                </div>
              </button>

              <button 
                disabled
                className="flex items-center justify-between p-6 rounded-3xl border-2 border-text-secondary/5 bg-background/50 opacity-40 grayscale cursor-not-allowed group"
              >
                <div className="flex items-center gap-5">
                  <div className="h-12 w-12 rounded-2xl bg-text-secondary/10 flex items-center justify-center text-text-secondary">
                    <span className="font-black italic text-lg">PP</span>
                  </div>
                  <div className="text-left">
                    <p className="font-black text-primary tracking-tight">PayPal <span className="text-[10px] font-bold bg-text-secondary/10 px-2 py-0.5 rounded ml-2 uppercase tracking-normal">Soon</span></p>
                    <p className="text-xs text-text-secondary font-medium mt-0.5">One-click checkout</p>
                  </div>
                </div>
              </button>
            </div>
          </section>

          <div className="p-8 rounded-[32px] bg-gradient-to-br from-primary/5 to-accent-sky/5 border border-primary/10">
            <h3 className="text-sm font-black text-primary uppercase tracking-widest mb-4">Patient Guarantee</h3>
            <p className="text-sm text-text-secondary leading-relaxed font-medium">
              Your appointment is fully refundable up to 24 hours before the scheduled time. In case of doctor cancellation, you will receive a full immediate refund to your original payment method.
            </p>
          </div>
        </div>

        <div className="lg:col-span-5 relative">
          <div className="sticky top-8 bg-surface rounded-[40px] border border-text-secondary/10 p-10 shadow-2xl shadow-primary/10 overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <CreditCard size={120} />
            </div>
            
            <h2 className="text-xl font-black text-primary mb-8 tracking-tight">Order Summary</h2>
            
            <div className="space-y-6 relative z-10">
              <SummaryRow label="Consultation Fee" value="$50.00" />
              <SummaryRow label="Service Tax" value="$0.00" />
              
              <div className="h-px bg-text-secondary/10 my-6" />
              
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-text-secondary/50 uppercase tracking-widest">Appointment For</span>
                  <span className="text-sm font-bold text-primary">Dr. {appointment.doctorName}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-text-secondary/50 uppercase tracking-widest">Type & Schedule</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-tighter">
                      {appointment.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-bold text-primary">
                      {appointmentDate.toLocaleDateString("en-GB", { day: '2-digit', month: 'short' })}, {appointmentDate.toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-8 space-y-6">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-black text-primary uppercase tracking-widest">Grand Total</span>
                  <span className="text-4xl font-black text-primary tracking-tighter">$50.00</span>
                </div>

                <button
                  type="button"
                  onClick={handlePayment}
                  disabled={processing}
                  className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:grayscale disabled:cursor-wait"
                >
                  {processing ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span className="animate-pulse">{processingMessage}</span>
                    </>
                  ) : (
                    <>
                      <span>Pay & Confirm</span>
                      <CreditCard className="h-5 w-5 opacity-50" />
                    </>
                  )}
                </button>

                {error && (
                  <div className="flex items-center gap-2 justify-center text-error animate-in shake-1">
                    <AlertCircle size={14} />
                    <p className="text-xs font-bold">{error}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm font-bold text-text-secondary/70">{label}</span>
      <span className="text-sm font-black text-primary tracking-tight">{value}</span>
    </div>
  );
}

