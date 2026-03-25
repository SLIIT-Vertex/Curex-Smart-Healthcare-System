import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  setStep,
  setErrors,
  setAnimDir,
  incrementAnimKey,
  resetOtpState,
  type RegisterErrors,
} from '../store/slices/registerSlice'

const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())
const isValidPhone = (p: string) => /^[\d\s+\-()]{7,15}$/.test(p.trim())

/**
 * Provides step navigation (next / back / goTo) and per-step field validation
 * for the multi-step registration wizard.
 *
 * All state lives in Redux so child step components can call this hook directly
 * without receiving props.
 *
 * @example
 * function PersonalStep() {
 *   const { next, back } = useRegisterNavigation()
 *   return <NavButtons onNext={next} onBack={back} />
 * }
 */
export const useRegisterNavigation = () => {
  const dispatch = useAppDispatch()
  const form     = useAppSelector(s => s.register)
  const step     = form.currentStep

  /** Navigate directly to a specific step with an animation direction. */
  const goTo = useCallback((target: number, dir: 'forward' | 'back') => {
    dispatch(setAnimDir(dir))
    dispatch(incrementAnimKey())
    dispatch(setStep(target))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [dispatch])

  /**
   * Validates the current step's fields.
   * Dispatches errors to Redux and returns `true` when the step is valid.
   */
  const validateStep = useCallback((): boolean => {
    const e: RegisterErrors = {}

    if (step === 2) {
      if (!form.firstName.trim()) e.firstName = 'First name is required'
      if (!form.lastName.trim())  e.lastName  = 'Last name is required'
      if (!form.dob)              e.dob       = 'Date of birth is required'
      else {
        const dobDate = new Date(form.dob)
        const now     = new Date()
        if (dobDate > now) {
          e.dob = 'Date of birth cannot be in the future'
        } else if (form.role === 'DOCTOR') {
          const minAge = 25
          const age = now.getFullYear() - dobDate.getFullYear() -
            (now < new Date(now.getFullYear(), dobDate.getMonth(), dobDate.getDate()) ? 1 : 0)
          if (age < minAge) e.dob = `Doctors must be at least ${minAge} years old`
        }
      }
      if (!form.gender)           e.gender    = 'Please select a gender'
      if (form.role === 'DOCTOR' && !form.profileImageUrl)
        e.profileImageUrl = 'A profile headshot is required for doctor accounts'
    }

    if (step === 4) {
      if (!form.phone.trim())             e.phone = 'Phone number is required'
      else if (!isValidPhone(form.phone)) e.phone = 'Enter a valid phone number'
      if (!form.email.trim())             e.email = 'Email address is required'
      else if (!isValidEmail(form.email)) e.email = 'Enter a valid email address'
    }

    if (step === 5) {
      if (form.password.length < 8)              e.password        = 'Password must be at least 8 characters'
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match'
    }

    if (step === 6) {
      if (!form.phoneVerified) e.phoneOtp = 'Please verify your phone number'
      if (!form.emailVerified) e.emailOtp = 'Please verify your email address'
    }

    dispatch(setErrors(e))
    return Object.keys(e).length === 0
  }, [dispatch, step, form])

  /** Validates the current step then advances to the next one. */
  const next = useCallback(() => {
    if (validateStep()) goTo(step + 1, 'forward')
  }, [validateStep, goTo, step])

  /**
   * Goes back one step without validation.
   * When leaving step 5 (Security) back to step 4 (Contact), OTP state is
   * cleared so the user must re-verify if their contact details change.
   */
  const back = useCallback(() => {
    if (step === 5) dispatch(resetOtpState())
    goTo(step - 1, 'back')
  }, [goTo, step, dispatch])

  const nextLabel = 'Continue'

  return { next, back, goTo, nextLabel }
}
