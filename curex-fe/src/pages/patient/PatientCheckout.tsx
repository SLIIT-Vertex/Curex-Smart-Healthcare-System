import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, ShieldCheck } from "lucide-react";
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

export function PatientCheckout() {
  const { user } = useAuth();
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<AppointmentRecord | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          setError("Appointment not found.");
        }
      } catch {
        setError("Failed to load appointment details.");
      } finally {
        setLoading(false);
      }
    }
    loadAppointment();
  }, [appointmentId, user?.id]);

  const handlePayment = async () => {
    if (!appointment || !appointmentId || !user?.id) return;
    try {
      setProcessing(true);
      setError(null);

      const successUrl = `${window.location.origin}/patient/appointments?payment=success&id=${appointmentId}`;
      const cancelUrl = `${window.location.origin}/patient/checkout/${appointmentId}?payment=cancelled`;

      const session = await createCheckoutSession(appointmentId, {
        patientId: user.id,
        amount: 50.0, // Fixed demo amount
        currency: "usd",
        successUrl,
        cancelUrl,
      });

      if (session.checkoutUrl) {
        window.location.href = session.checkoutUrl;
      } else {
        throw new Error("No checkout URL received from server.");
      }
    } catch (err: unknown) {
      setError(
        extractServerMessage(err) ??
          "Failed to initiate payment. Please try again later.",
      );
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate("/patient/appointments")}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition"
        >
          <ArrowLeft size={16} /> Back to Appointments
        </button>
        <div className="rounded-2xl border border-error/20 bg-error/5 p-6 text-center">
          <p className="text-primary font-medium">
            {error || "Appointment not found."}
          </p>
        </div>
      </div>
    );
  }

  const appointmentDate = new Date(appointment.appointmentTime);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        onClick={() => navigate("/patient/appointments")}
        className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition"
      >
        <ArrowLeft size={16} /> Back to Appointments
      </button>

      <div>
        <h1 className="section-heading">Checkout</h1>
        <p className="section-subtext mt-1">
          Complete your payment to confirm your appointment with{" "}
          {appointment.doctorName}.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <div className="appointment-panel p-6">
            <h2 className="text-lg font-semibold text-primary mb-4">
              Payment Method
            </h2>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-primary bg-primary-light/5 text-primary">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-semibold text-sm">Credit / Debit Card</p>
                    <p className="text-xs text-text-secondary/70">
                      Secure payment via Stripe
                    </p>
                  </div>
                </div>
                <div className="h-5 w-5 rounded-full border-4 border-primary"></div>
              </button>

              <button
                disabled
                className="w-full flex items-center justify-between p-4 rounded-xl border border-text-secondary/10 bg-background/50 text-text-secondary opacity-60 cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 flex items-center justify-center font-bold italic text-blue-600">
                    PP
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">PayPal</p>
                    <p className="text-xs">Coming soon</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-accent-mint/10 border border-accent-mint/20 text-text-secondary text-sm">
            <ShieldCheck className="h-5 w-5 text-accent-mint shrink-0" />
            <p>
              Your payment information is processed securely. We do not store
              your credit card details on our servers.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="appointment-panel p-6">
            <h2 className="text-lg font-semibold text-primary mb-4">Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Consultation Fee</span>
                <span className="font-medium text-primary">$50.00</span>
              </div>
              <div className="flex justify-between text-sm border-t border-text-secondary/10 pt-4">
                <span className="text-text-secondary">Doctor</span>
                <span className="font-medium text-primary text-right">
                  {appointment.doctorName}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Type</span>
                <span className="font-medium text-primary italic capitalize">
                  {appointment.type.toLowerCase().replace("_", " ")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Date</span>
                <span className="font-medium text-primary">
                  {appointmentDate.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Time</span>
                <span className="font-medium text-primary">
                  {appointmentDate.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div className="pt-4 border-t border-text-secondary/10">
                <div className="flex justify-between text-base font-bold text-primary">
                  <span>Total</span>
                  <span>$50.00</span>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={processing}
                className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-surface border-t-transparent"></div>
                    Processing...
                  </>
                ) : (
                  "Confirm & Pay"
                )}
              </button>

              {error && (
                <p className="text-xs text-error mt-2 text-center">{error}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
