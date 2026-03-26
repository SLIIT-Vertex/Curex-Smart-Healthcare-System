import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { authService } from "../../services/authService";
import { useAppDispatch, useAppSelector, useToast } from "../../store/hooks";
import { setCredentials, setLoading } from "../../store/slices/authSlice";
import { ROLE_HOME } from "../../components/auth/roleHome";
import { LoginBrandPanel } from "../../components/auth/LoginBrandPanel";
import type { ForgotPasswordChannel, Role } from "../../types/auth";

type LoginStep = "email" | "password";
type PageMode = "login" | "forgot";
type ForgotStep = "channel" | "otp" | "reset";

/** Basic email format check. */
const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

/**
 * Two-step login wizard (email → password).
 *
 * - Loading state lives in Redux (authSlice.isLoading).
 * - Transient UI state (step, field values, error, animation key) stays local
 *   because it only matters for this single session and resets on navigate.
 */
export const LoginPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const isLoading = useAppSelector((s) => s.auth.isLoading);

  const [step, setStep] = useState<LoginStep>("email");
  const [animDir, setAnimDir] = useState<"forward" | "back">("forward");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const [mode, setMode] = useState<PageMode>("login");
  const [forgotStep, setForgotStep] = useState<ForgotStep>("channel");
  const [forgotChannel, setForgotChannel] = useState<ForgotPasswordChannel>("EMAIL");
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotVerificationToken, setForgotVerificationToken] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const from = (location.state as { from?: { pathname: string } })?.from
    ?.pathname;

  useEffect(() => {
    if (mode === "forgot") return;
    if (step === "email") emailRef.current?.focus();
    else passwordRef.current?.focus();
  }, [mode, step]);

  const goToPassword = useCallback(() => {
    if (!isValidEmail(email)) {
      setFieldError("Please enter a valid email address.");
      return;
    }
    setFieldError(null);
    setAnimDir("forward");
    setAnimKey((k) => k + 1);
    setStep("password");
  }, [email]);

  const goBackToEmail = useCallback(() => {
    setFieldError(null);
    setAnimDir("back");
    setAnimKey((k) => k + 1);
    setStep("email");
  }, []);

  const handleEmailChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
    [],
  );
  const handlePasswordChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
    [],
  );
  const toggleShowPassword = useCallback(() => setShowPassword((v) => !v), []);

  const handleEmailKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        goToPassword();
      }
    },
    [goToPassword],
  );

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (step === "email") {
        goToPassword();
        return;
      }
      if (!password) {
        setFieldError("Please enter your password.");
        return;
      }

      setFieldError(null);
      dispatch(setLoading(true));
      try {
        const response = await authService.login({
          email: email.trim(),
          password,
        });
        dispatch(setCredentials(response));
        toast("Welcome back!", "success");

        // PENDING doctors should see the approval status page, not the dashboard.
        const dest =
          response.user.role === "DOCTOR" &&
          response.user.accountStatus === "PENDING"
            ? "/doctor/pending"
            : (from ?? ROLE_HOME[response.user.role as Role]);
        navigate(dest, { replace: true });
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? "Invalid email or password.";
        setFieldError(msg);
        toast(msg, "error");
      } finally {
        dispatch(setLoading(false));
      }
    },
    [step, password, email, from, dispatch, navigate, toast, goToPassword],
  );

  const startForgotFlow = useCallback(() => {
    setMode("forgot");
    setForgotStep("channel");
    setForgotError(null);
    setForgotLoading(false);
    setForgotOtp("");
    setForgotVerificationToken("");
    setForgotNewPassword("");
    setForgotConfirmPassword("");
    setForgotIdentifier((prev) => (prev || email || "").trim());
  }, [email]);

  const backToLogin = useCallback(() => {
    setMode("login");
    setForgotStep("channel");
    setForgotError(null);
    setForgotLoading(false);
    setForgotOtp("");
    setForgotVerificationToken("");
    setForgotNewPassword("");
    setForgotConfirmPassword("");
  }, []);

  const sendForgotOtp = useCallback(async () => {
    const identifier = forgotIdentifier.trim();
    if (!identifier) {
      setForgotError(
        forgotChannel === "EMAIL"
          ? "Please enter your email address."
          : "Please enter your phone number.",
      );
      return;
    }

    setForgotError(null);
    setForgotLoading(true);
    try {
      await authService.sendForgotPasswordOtp({
        identifier,
        channel: forgotChannel,
      });
      toast("OTP sent successfully", "success");
      setForgotStep("otp");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to send OTP.";
      setForgotError(msg);
      toast(msg, "error");
    } finally {
      setForgotLoading(false);
    }
  }, [forgotChannel, forgotIdentifier, toast]);

  const verifyForgotOtp = useCallback(async () => {
    const identifier = forgotIdentifier.trim();
    if (!forgotOtp || forgotOtp.trim().length !== 6) {
      setForgotError("Please enter the 6-digit OTP.");
      return;
    }

    setForgotError(null);
    setForgotLoading(true);
    try {
      const res = await authService.verifyForgotPasswordOtp({
        identifier,
        channel: forgotChannel,
        otpCode: forgotOtp.trim(),
      });
      setForgotVerificationToken(res.verificationToken);
      setForgotStep("reset");
      toast("OTP verified", "success");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "OTP verification failed.";
      setForgotError(msg);
      toast(msg, "error");
    } finally {
      setForgotLoading(false);
    }
  }, [forgotChannel, forgotIdentifier, forgotOtp, toast]);

  const resetForgotPassword = useCallback(async () => {
    const identifier = forgotIdentifier.trim();
    if (forgotNewPassword.length < 8) {
      setForgotError("Password must be at least 8 characters.");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("Passwords do not match.");
      return;
    }
    if (!forgotVerificationToken) {
      setForgotError("Session expired. Please verify OTP again.");
      setForgotStep("otp");
      return;
    }

    setForgotError(null);
    setForgotLoading(true);
    try {
      await authService.resetForgotPassword({
        identifier,
        channel: forgotChannel,
        verificationToken: forgotVerificationToken,
        newPassword: forgotNewPassword,
      });
      toast("Password changed successfully", "success");
      backToLogin();
      setStep("email");
      setPassword("");
      if (forgotChannel === "EMAIL") {
        setEmail(identifier);
      }
      navigate("/login", { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to reset password.";
      setForgotError(msg);
      toast(msg, "error");
    } finally {
      setForgotLoading(false);
    }
  }, [
    forgotNewPassword,
    forgotConfirmPassword,
    forgotVerificationToken,
    forgotIdentifier,
    forgotChannel,
    toast,
    backToLogin,
    navigate,
  ]);

  const animClass =
    animDir === "forward" ? "auth-step-enter-forward" : "auth-step-enter-back";

  return (
    <div className="flex min-h-dvh bg-background">
      <LoginBrandPanel />

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <a
          href="/"
          className="mb-10 flex items-center gap-2.5 no-underline lg:hidden"
        >
          <img src="/logo.svg" alt="" className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight text-primary">
            Curex
          </span>
        </a>

        <div className="w-full max-w-[360px]">
          {/* Step progress bar */}
          <div className="auth-step-bar gap-1.5">
            {(["email", "password"] as LoginStep[]).map((s, i) => (
              <div
                key={s}
                className={`auth-step-segment ${
                  step === "email" && i === 0
                    ? "active"
                    : step === "password" && i === 0
                      ? "done"
                      : step === "password" && i === 1
                        ? "active"
                        : "todo"
                }`}
              />
            ))}
          </div>

          {mode === "login" && (
            <form
              key={animKey}
              className={`${animClass} flex flex-col gap-5`}
              onSubmit={handleSubmit}
              noValidate
              data-testid="login-form"
            >
              {step === "email" ? (
              <>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-primary">
                    Sign in to Curex
                  </h1>
                  <p className="mt-1.5 text-sm text-text-secondary">
                    Don't have an account?{" "}
                    <Link
                      to="/register"
                      className="font-semibold text-primary-light hover:underline"
                    >
                      Create one
                    </Link>
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="email"
                    className="text-sm font-semibold text-primary"
                  >
                    Email address
                  </label>
                  <input
                    ref={emailRef}
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={handleEmailChange}
                    onKeyDown={handleEmailKeyDown}
                    placeholder="you@example.com"
                    className="auth-input"
                    data-testid="login-email-input"
                  />
                </div>

                {fieldError && (
                  <p
                    role="alert"
                    className="rounded-xl bg-error/10 px-3 py-2.5 text-sm text-error"
                  >
                    {fieldError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={goToPassword}
                  className="btn-primary w-full justify-center gap-2.5 py-3 text-base mt-1"
                  data-testid="login-continue-button"
                >
                  Continue <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </button>
              </>
              ) : (
              <>
                <div>
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={goBackToEmail}
                      className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors"
                      data-testid="login-back-button"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Change email
                    </button>
                  </div>

                  <div className="mb-1">
                    <div className="flex h-9 items-center gap-2 rounded-xl bg-primary/6 border border-primary/12 px-3 text-sm text-primary font-medium w-fit">
                      <span className="h-2 w-2 rounded-full bg-accent-mint" />
                      {email}
                    </div>
                  </div>

                  <h1 className="mt-3 text-2xl font-bold tracking-tight text-primary">
                    Enter your password
                  </h1>
                  <p className="mt-1 text-sm text-text-secondary">
                    Sign in to your Curex account
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="text-sm font-semibold text-primary"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={startForgotFlow}
                      className="text-xs text-text-secondary hover:text-primary cursor-pointer transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      ref={passwordRef}
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={handlePasswordChange}
                      placeholder="••••••••"
                      className="auth-input pr-11"
                      data-testid="login-password-input"
                    />
                    <button
                      type="button"
                      onClick={toggleShowPassword}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary transition-colors hover:text-primary"
                      data-testid="login-toggle-password"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                      ) : (
                        <Eye className="h-4 w-4" strokeWidth={1.5} />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary mt-1 w-full justify-center gap-2.5 py-3 text-base disabled:opacity-60"
                  data-testid="login-submit-button"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  {isLoading ? "Signing in…" : "Sign in"}
                </button>
              </>
              )}
            </form>
          )}

          {mode === "forgot" && (
            <div className="flex flex-col gap-5" data-testid="forgot-password-flow">
              <div>
                <button
                  type="button"
                  onClick={backToLogin}
                  className="mb-4 flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                </button>
                <h1 className="text-2xl font-bold tracking-tight text-primary">
                  {forgotStep === "channel" && "Forgot Password"}
                  {forgotStep === "otp" && "Verify OTP"}
                  {forgotStep === "reset" && "Set New Password"}
                </h1>
                <p className="mt-1 text-sm text-text-secondary">
                  {forgotStep === "channel" &&
                    "Choose where to receive your verification code."}
                  {forgotStep === "otp" &&
                    "Enter the OTP to verify your identity."}
                  {forgotStep === "reset" &&
                    "Create a new password for your account."}
                </p>
              </div>

              {forgotStep === "channel" && (
                <>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForgotChannel("EMAIL")}
                      className={`rounded-lg px-3 py-2 text-sm font-medium border ${
                        forgotChannel === "EMAIL"
                          ? "border-primary-light bg-primary-light/10 text-primary"
                          : "border-text-secondary/20 text-text-secondary"
                      }`}
                    >
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setForgotChannel("SMS")}
                      className={`rounded-lg px-3 py-2 text-sm font-medium border ${
                        forgotChannel === "SMS"
                          ? "border-primary-light bg-primary-light/10 text-primary"
                          : "border-text-secondary/20 text-text-secondary"
                      }`}
                    >
                      Phone
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-primary">
                      {forgotChannel === "EMAIL" ? "Email address" : "Phone number"}
                    </label>
                    <input
                      type={forgotChannel === "EMAIL" ? "email" : "text"}
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      placeholder={
                        forgotChannel === "EMAIL" ? "you@example.com" : "+94 77 123 4567"
                      }
                      className="auth-input"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={sendForgotOtp}
                    disabled={forgotLoading}
                    className="btn-primary w-full justify-center gap-2.5 py-3 text-base mt-1 disabled:opacity-60"
                  >
                    {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {forgotLoading ? "Sending..." : "Send OTP"}
                  </button>
                </>
              )}

              {forgotStep === "otp" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-primary">OTP code</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="Enter 6-digit OTP"
                      className="auth-input"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForgotStep("channel")}
                      className="btn-secondary flex-1 justify-center"
                    >
                      Change channel
                    </button>
                    <button
                      type="button"
                      onClick={verifyForgotOtp}
                      disabled={forgotLoading}
                      className="btn-primary flex-1 justify-center disabled:opacity-60"
                    >
                      {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify OTP"}
                    </button>
                  </div>
                </>
              )}

              {forgotStep === "reset" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-primary">New password</label>
                    <input
                      type="password"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="auth-input"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-primary">Confirm password</label>
                    <input
                      type="password"
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="auth-input"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={resetForgotPassword}
                    disabled={forgotLoading}
                    className="btn-primary w-full justify-center gap-2.5 py-3 text-base disabled:opacity-60"
                  >
                    {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {forgotLoading ? "Changing..." : "Change password"}
                  </button>
                </>
              )}

              {forgotError && (
                <p
                  role="alert"
                  className="rounded-xl bg-error/10 px-3 py-2.5 text-sm text-error"
                >
                  {forgotError}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
