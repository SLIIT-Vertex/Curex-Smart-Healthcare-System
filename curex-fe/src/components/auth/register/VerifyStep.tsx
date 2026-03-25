import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, Mail, CheckCircle2, ArrowRight, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react'
import { useAppDispatch, useAppSelector, useToast } from '../../../store/hooks'
import { setField, setGlobalError, resetRegisterForm } from '../../../store/slices/registerSlice'
import { setCredentials, setLoading } from '../../../store/slices/authSlice'
import { useOtpVerification } from '../../../hooks/useOtpVerification'
import { useRegisterNavigation } from '../../../hooks/useRegisterNavigation'
import { authService } from '../../../services/authService'
import type { UpdateProfileRequest } from '../../../types/auth'
import { ROLE_HOME } from '../../auth/ProtectedRoute'
import { OtpInput } from '../OtpInput'

/**
 * Step 6 (final) — OTP verification and account creation.
 *
 * OTPs for both phone and email must be verified before the "Create account"
 * button appears. On success, calls POST /api/auth/register followed by
 * PUT /api/users/me/profile to persist supplementary profile data.
 * Zero-param: all state from Redux + useOtpVerification hook.
 */
export const VerifyStep = () => {
  const dispatch          = useAppDispatch()
  const navigate          = useNavigate()
  const { toast }         = useToast()
  const { back }          = useRegisterNavigation()
  const form              = useAppSelector(s => s.register)
  const isLoading         = useAppSelector(s => s.auth.isLoading)
  const errors            = form.errors
  const { sendOtp, verifyOtps, resendOtp } = useOtpVerification()

  const handlePhoneOtpChange = useCallback((v: string) => {
    dispatch(setField({ key: 'phoneOtp', value: v }))
  }, [dispatch])

  const handleEmailOtpChange = useCallback((v: string) => {
    dispatch(setField({ key: 'emailOtp', value: v }))
  }, [dispatch])

  const allVerified = form.phoneVerified && form.emailVerified

  /**
   * Final registration call: Step 1 registers with identity data, Step 2
   * persists supplementary profile data collected during the wizard.
   */
  const handleSubmit = useCallback(async () => {
    dispatch(setGlobalError(null))
    dispatch(setLoading(true))
    try {
      // Step 1 — create account with identity-only payload.
      const response = await authService.register({
        email:                   form.email.trim(),
        password:                form.password,
        firstName:               form.firstName.trim(),
        lastName:                form.lastName.trim(),
        phoneNumber:             form.phone.trim(),
        phoneVerificationToken:  form.phoneVerificationToken,
        emailVerificationToken:  form.emailVerificationToken,
        role:                    form.role,
      })

      // Store JWT so the profile update call is automatically authenticated.
      dispatch(setCredentials(response))

      // Step 2 — persist supplementary profile data.
      const profile: UpdateProfileRequest = {
        dob:     form.dob     || undefined,
        gender:  form.gender  || undefined,
        address: form.address || undefined,
      }

      if (form.role === 'DOCTOR') {
        profile.specialty            = form.specialty.trim()            || undefined
        profile.medicalLicenseNumber = form.medicalLicenseNumber.trim() || undefined
        profile.certifications       = form.certifications.trim()       || undefined
        const exp = parseInt(form.yearsOfExperience, 10)
        if (!isNaN(exp) && exp >= 0) profile.yearsOfExperience = exp
      }

      if (form.role === 'PATIENT' && form.fillHealthNow) {
        profile.bloodGroup            = form.bloodGroup            || undefined
        profile.allergies             = form.allergies             || undefined
        profile.chronicConditions     = form.chronicConditions     || undefined
        profile.emergencyContactName  = form.emergencyContactName  || undefined
        profile.emergencyContactPhone = form.emergencyContactPhone || undefined
      }

      const hasProfileData = Object.values(profile).some((v) => v !== undefined)
      if (hasProfileData) {
        await authService.updateProfile(profile)
      }

      dispatch(resetRegisterForm())
      toast('Account created! Welcome to Curex.', 'success')
      navigate(ROLE_HOME[form.role], { replace: true })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Registration failed. Please try again.'
      dispatch(setGlobalError(msg))
      toast(msg, 'error')
    } finally {
      dispatch(setLoading(false))
    }
  }, [dispatch, navigate, toast, form])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Verify your contacts</h1>
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
                <Phone className="h-4 w-4 text-primary-light" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">{form.phone}</p>
                <p className="text-xs text-text-secondary">SMS code</p>
              </div>
              {form.phoneVerified && (
                <CheckCircle2 className="ml-auto h-5 w-5 text-status-healthy" strokeWidth={1.75} />
              )}
            </div>
            <div className="flex items-center gap-3 border-t border-text-secondary/10 pt-3 mt-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/6">
                <Mail className="h-4 w-4 text-primary-light" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">{form.email}</p>
                <p className="text-xs text-text-secondary">Email code</p>
              </div>
              {form.emailVerified && (
                <CheckCircle2 className="ml-auto h-5 w-5 text-status-healthy" strokeWidth={1.75} />
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
            {form.otpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Send verification codes <ArrowRight className="h-4 w-4" strokeWidth={2} />
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
              <CheckCircle2 className="h-5 w-5 text-status-healthy" strokeWidth={1.75} />
              <p className="text-sm font-semibold text-primary">All contacts verified!</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={verifyOtps}
              disabled={form.otpLoading}
              className="btn-primary w-full justify-center gap-2 py-3 disabled:opacity-60"
              data-testid="register-verify-otp-button"
            >
              {form.otpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
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
        <p role="alert" className="rounded-xl bg-error/10 px-3 py-2.5 text-sm text-error">
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
            {isLoading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</>
              : <><ShieldCheck className="h-4 w-4" strokeWidth={1.75} /> Create account</>
            }
          </button>
        )}
      </div>
    </div>
  )
}
