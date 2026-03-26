import { useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Phone,
  Mail,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Clock,
  LogIn,
} from "lucide-react";
import { useAppDispatch, useAppSelector, useToast } from "../../../store/hooks";
import {
  setField,
  setGlobalError,
  resetRegisterForm,
  resetOtpState,
  setDoctorPending,
} from "../../../store/slices/registerSlice";
import { setCredentials, setLoading } from "../../../store/slices/authSlice";
import { useOtpVerification } from "../../../hooks/useOtpVerification";
import { useRegisterNavigation } from "../../../hooks/useRegisterNavigation";
import { authService } from "../../../services/authService";
import { ROLE_HOME } from "../../auth/roleHome";
import { OtpInput } from "../OtpInput";

/**
 * Step 6 (final) — OTP verification and account creation.
 *
 * OTPs for both phone and email must be verified before the "Create account"
 * button appears. On success, calls POST /api/auth/register followed by
 * PUT /api/users/me/profile to persist supplementary profile data.
 * Zero-param: all state from Redux + useOtpVerification hook.
 */
export const VerifyStep = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { back } = useRegisterNavigation();
  const form = useAppSelector((s) => s.register);
  const isLoading = useAppSelector((s) => s.auth.isLoading);
  const errors = form.errors;
  const { sendOtp, verifyOtps, resendOtp } = useOtpVerification();

  const handlePhoneOtpChange = useCallback(
    (v: string) => {
      dispatch(setField({ key: "phoneOtp", value: v }));
    },
    [dispatch],
  );

  const handleEmailOtpChange = useCallback(
    (v: string) => {
      dispatch(setField({ key: "emailOtp", value: v }));
    },
    [dispatch],
  );

  const allVerified = form.phoneVerified && form.emailVerified;

  /**
   * Final registration call: Step 1 registers with identity data, Step 2
   * persists supplementary profile data collected during the wizard.
   */
  const handleSubmit = useCallback(async () => {
    dispatch(setGlobalError(null));
    dispatch(setLoading(true));
    try {
      // Build the exp value before the call so the parseInt side-effect is clean.
      const exp = parseInt(form.yearsOfExperience, 10);

      // All profile data is included in the registration payload so that
      // doctors (who receive no token) don't need a second authenticated call.
      const response = await authService.register({
        // Required identity
        email: form.email.trim(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phoneNumber: form.phone.trim(),
        phoneVerificationToken: form.phoneVerificationToken,
        emailVerificationToken: form.emailVerificationToken,
        role: form.role,
        // Common profile
        profileImageUrl: form.profileImageUrl || undefined,
        dob: form.dob || undefined,
        gender: form.gender || undefined,
        address: form.address || undefined,
        // Doctor-specific
        ...(form.role === "DOCTOR" && {
          specialty: form.specialty.trim() || undefined,
          medicalLicenseNumber: form.medicalLicenseNumber.trim() || undefined,
          certifications: form.certifications.trim() || undefined,
          proofDocumentUrls: form.proofDocumentUrls.trim() || undefined,
          yearsOfExperience: !isNaN(exp) && exp >= 0 ? exp : undefined,
        }),
        // Patient-specific (only when the user opted in)
        ...(form.role === "PATIENT" &&
          form.fillHealthNow && {
            bloodGroup: form.bloodGroup || undefined,
            allergies: form.allergies || undefined,
            chronicConditions: form.chronicConditions || undefined,
            emergencyContactName: form.emergencyContactName || undefined,
            emergencyContactPhone: form.emergencyContactPhone || undefined,
          }),
      });

      // Doctors receive no token — the backend keeps them unauthenticated until approved.
      if (form.role === "DOCTOR") {
        toast("Account created! Your application is under review.", "success");
        dispatch(setDoctorPending(true));
      } else {
        // Patients are approved immediately — log them in and redirect.
        dispatch(setCredentials(response));
        toast("Account created! Welcome to Curex.", "success");
        navigate(ROLE_HOME[form.role], { replace: true });
        dispatch(resetRegisterForm());
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Registration failed. Please try again.";
      dispatch(setGlobalError(msg));
      dispatch(resetOtpState());
      toast(msg, "error");
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, navigate, toast, form]);

  // ── Doctor submitted: show pending approval section inline ──
  if (form.doctorPending) {
    return (
      <div className="flex flex-col gap-5 auth-fade-in">
        {/* Status icon + heading */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 mb-4">
            <Clock className="h-8 w-8 text-amber-500" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Application Under Review
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary max-w-sm">
            Your account has been created and is now pending admin approval.
          </p>
        </div>

        {/* What happens next */}
        <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 text-left">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck
              className="h-4 w-4 text-primary-light"
              strokeWidth={1.5}
            />
            <p className="text-sm font-semibold text-primary">
              What happens next?
            </p>
          </div>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary-light">
                1
              </span>
              <span>
                Our admin team will review your credentials and uploaded
                documents.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary-light">
                2
              </span>
              <span>
                Verification typically takes{" "}
                <strong className="text-primary">1–2 business days</strong>.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary-light">
                3
              </span>
              <span>
                Once approved, you'll have full access to the doctor dashboard.
              </span>
            </li>
          </ul>
        </div>

        {/* Email notification */}
        <div className="rounded-xl bg-accent-sky/8 border border-accent-sky/20 p-4 text-left">
          <div className="flex items-center gap-2 mb-1.5">
            <Mail className="h-4 w-4 text-accent-sky" strokeWidth={1.5} />
            <p className="text-sm font-semibold text-primary">
              We'll notify you
            </p>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">
            You'll receive an email once your account has been approved.
          </p>
        </div>

        {/* Status badge */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-2">
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
              Pending Approval
            </span>
          </div>
        </div>

        {/* Go to login */}
        <Link
          to="/login"
          className="btn-primary w-full justify-center gap-2 py-3 no-underline"
        >
          <LogIn className="h-4 w-4" strokeWidth={1.5} />
          Go to Login
        </Link>
      </div>
    );
  }

  // ── Normal OTP verification flow ──
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Verify your contacts
        </h1>
        <p className="mt-1.5 text-sm text-text-secondary">
          We'll send separate 6-digit codes to your phone and email.
        </p>
      </div>

      {!form.otpSent ? (
        /* ── Pre-send: show contact summary ── */
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-xl border border-text-secondary/15 bg-surface p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/6">
                <Phone
                  className="h-4 w-4 text-primary-light"
                  strokeWidth={1.5}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">
                  {form.phone}
                </p>
                <p className="text-xs text-text-secondary">SMS code</p>
              </div>
              {form.phoneVerified && (
                <CheckCircle2
                  className="ml-auto h-5 w-5 text-status-healthy"
                  strokeWidth={1.75}
                />
              )}
            </div>
            <div className="flex items-center gap-3 border-t border-text-secondary/10 pt-3 mt-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/6">
                <Mail
                  className="h-4 w-4 text-primary-light"
                  strokeWidth={1.5}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">
                  {form.email}
                </p>
                <p className="text-xs text-text-secondary">Email code</p>
              </div>
              {form.emailVerified && (
                <CheckCircle2
                  className="ml-auto h-5 w-5 text-status-healthy"
                  strokeWidth={1.75}
                />
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={sendOtp}
            disabled={form.otpLoading}
            className="btn-primary w-full justify-center gap-2 py-3 text-base disabled:opacity-60"
            data-testid="register-send-otp-button"
          >
            {form.otpLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Send verification codes{" "}
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      ) : (
        /* ── Post-send: OTP entry ── */
        <div className="auth-fade-in flex flex-col gap-5">
          <OtpInput
            label={`Code sent to ${form.phone}`}
            value={form.phoneOtp}
            onChange={handlePhoneOtpChange}
            testId="otp-phone-cell"
          />
          {errors.phoneOtp && (
            <p className="text-xs text-error -mt-3">{errors.phoneOtp}</p>
          )}

          <OtpInput
            label={`Code sent to ${form.email}`}
            value={form.emailOtp}
            onChange={handleEmailOtpChange}
            testId="otp-email-cell"
          />
          {errors.emailOtp && (
            <p className="text-xs text-error -mt-3">{errors.emailOtp}</p>
          )}

          {allVerified ? (
            <div className="flex items-center gap-2 rounded-xl bg-status-healthy/10 border border-status-healthy/25 px-4 py-3">
              <CheckCircle2
                className="h-5 w-5 text-status-healthy"
                strokeWidth={1.75}
              />
              <p className="text-sm font-semibold text-primary">
                All contacts verified!
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={verifyOtps}
              disabled={form.otpLoading}
              className="btn-primary w-full justify-center gap-2 py-3 disabled:opacity-60"
              data-testid="register-verify-otp-button"
            >
              {form.otpLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Verify codes
            </button>
          )}

          <button
            type="button"
            onClick={resendOtp}
            disabled={form.otpLoading}
            className="text-xs text-text-secondary hover:text-primary transition-colors text-center disabled:opacity-50"
            data-testid="register-resend-otp-button"
          >
            Didn't receive a code? Resend
          </button>
        </div>
      )}

      {form.globalError && (
        <p
          role="alert"
          className="rounded-xl bg-error/10 px-3 py-2.5 text-sm text-error"
        >
          {form.globalError}
        </p>
      )}

      {/* Bottom navigation — Back always visible, Create Account only after full verification */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={back}
          disabled={isLoading}
          className="btn-secondary flex items-center gap-2 py-3 px-5 disabled:opacity-50"
          data-testid="register-step6-back"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        </button>
        {allVerified && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="btn-primary flex-1 justify-center gap-2.5 py-3 text-base disabled:opacity-60"
            data-testid="register-submit-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Creating account…
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" strokeWidth={1.75} /> Create
                account
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
