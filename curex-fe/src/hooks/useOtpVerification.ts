import { useCallback } from 'react'
import { authService } from '../services/authService'
import { useAppDispatch, useAppSelector, useToast } from '../store/hooks'
import {
  markOtpSent,
  setErrors,
  setField,
  setOtpLoading,
  verifyEmail,
  verifyPhone,
} from '../store/slices/registerSlice'

/** Extracts the `message` field from an Axios error response, falling back to null. */
const extractApiError = (err: unknown): string | null =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? null

/**
 * Encapsulates the OTP send and verify flows for the registration wizard.
 *
 * Dispatches all state changes (loading, verification flags, tokens) to Redux
 * so the VerifyStep component remains free of async logic.
 *
 * Both phone and email OTPs are independent 6-digit codes sent via the
 * notification-service (SMS and Email respectively).
 */
export const useOtpVerification = () => {
  const dispatch  = useAppDispatch()
  const form      = useAppSelector(s => s.register)
  const { toast } = useToast()

  /**
   * Calls POST /api/auth/otp/send for both the registered phone number and email.
   * On success, marks the OTP as sent in Redux.
   */
  const sendOtp = useCallback(async () => {
    dispatch(setOtpLoading(true))
    try {
      await authService.sendOtp({ phoneNumber: form.phone, email: form.email })
      dispatch(markOtpSent())
      toast(`OTP codes sent to ${form.phone} and ${form.email}`, 'success')
    } catch (err) {
      const msg = extractApiError(err) ?? 'Failed to send OTP. Please try again.'
      toast(msg, 'error')
    } finally {
      dispatch(setOtpLoading(false))
    }
  }, [dispatch, form.phone, form.email, toast])

  /**
   * Validates the entered OTP cells locally, then calls POST /api/auth/otp/verify.
   * On success, stores both `phoneVerificationToken` and `emailVerificationToken`
   * in Redux and marks both as verified.
   */
  const verifyOtps = useCallback(async () => {
    const phoneCode = form.phoneOtp.replace(/\s/g, '')
    const emailCode = form.emailOtp.replace(/\s/g, '')

    // Client-side pre-validation
    const localErrors: Record<string, string> = {}
    if (phoneCode.length !== 6) localErrors.phoneOtp = 'Enter the 6-digit code sent to your phone'
    if (emailCode.length !== 6) localErrors.emailOtp = 'Enter the 6-digit code sent to your email'

    if (Object.keys(localErrors).length > 0) {
      dispatch(setErrors(localErrors))
      return
    }

    dispatch(setOtpLoading(true))
    try {
      // Verify both phone and email OTPs with the backend.
      const { verificationToken, emailVerificationToken } = await authService.verifyOtp({
        phoneNumber: form.phone,
        otpCode: phoneCode,
        email: form.email,
        emailOtpCode: emailCode,
      })

      dispatch(setField({ key: 'phoneVerificationToken', value: verificationToken }))
      dispatch(setField({ key: 'emailVerificationToken', value: emailVerificationToken }))
      dispatch(verifyPhone())
      dispatch(verifyEmail())

      toast('Phone and email verified successfully!', 'success')
    } catch (err) {
      const msg = extractApiError(err) ?? 'Invalid OTP code. Please try again.'
      dispatch(setErrors({ phoneOtp: msg }))
      toast(msg, 'error')
    } finally {
      dispatch(setOtpLoading(false))
    }
  }, [dispatch, form.phone, form.email, form.phoneOtp, form.emailOtp, toast])

  /** Resends the OTP (same as sendOtp but also resets the sent flag first). */
  const resendOtp = useCallback(async () => {
    await sendOtp()
  }, [sendOtp])

  return { sendOtp, verifyOtps, resendOtp }
}
