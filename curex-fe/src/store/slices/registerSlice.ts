import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

// ─── Error key union ─────────────────────────────────────────────────────────

/** Union of all field keys that can carry a validation error. */
export type RegisterErrorKey =
  | 'firstName' | 'lastName' | 'dob' | 'gender'
  | 'phone' | 'email'
  | 'phoneOtp' | 'emailOtp'
  | 'password' | 'confirmPassword'

export type RegisterErrors = Partial<Record<RegisterErrorKey, string>>

// ─── Form state shape ─────────────────────────────────────────────────────────

export interface RegisterFormState {
  // Step 1 — role
  role: 'PATIENT' | 'DOCTOR'
  // Step 2 — personal
  firstName: string
  lastName: string
  dob: string
  gender: string
  address: string
  // Step 3a — patient health
  fillHealthNow: boolean
  bloodGroup: string
  allergies: string
  chronicConditions: string
  emergencyContactName: string
  emergencyContactPhone: string
  // Step 3b — doctor qualifications
  specialty: string
  medicalLicenseNumber: string
  yearsOfExperience: string
  certifications: string
  // Step 4 — contact
  phone: string
  email: string
  // Step 5 — OTP
  phoneOtp: string
  emailOtp: string
  phoneVerified: boolean
  emailVerified: boolean
  /** Token returned by POST /api/auth/otp/verify — proves phone ownership. */
  phoneVerificationToken: string
  /** Token returned by POST /api/auth/otp/verify — proves email ownership. */
  emailVerificationToken: string
  // Step 6 — security
  password: string
  confirmPassword: string
  // ── Wizard meta ─────────────────────────────────────────────────────────
  currentStep: number
  otpSent: boolean
  // ── UI state (moved from component local state) ──────────────────────────
  /** Direction the step animation plays. */
  animDir: 'forward' | 'back'
  /** Incremented on each step change to re-key the animation container. */
  animKey: number
  /** Per-field validation errors for the current step. */
  errors: RegisterErrors
  /** Top-level error shown during final form submission. */
  globalError: string | null
  /** Loading flag for async OTP send / verify calls. */
  otpLoading: boolean
}

const initialState: RegisterFormState = {
  role: 'PATIENT',
  firstName: '', lastName: '', dob: '', gender: '', address: '',
  fillHealthNow: false,
  bloodGroup: '', allergies: '', chronicConditions: '',
  emergencyContactName: '', emergencyContactPhone: '',
  specialty: '', medicalLicenseNumber: '', yearsOfExperience: '', certifications: '',
  phone: '', email: '',
  phoneOtp: '', emailOtp: '',
  phoneVerified: false, emailVerified: false,
  phoneVerificationToken: '',
  emailVerificationToken: '',
  password: '', confirmPassword: '',
  currentStep: 1,
  otpSent: false,
  animDir: 'forward',
  animKey: 0,
  errors: {},
  globalError: null,
  otpLoading: false,
}

const registerSlice = createSlice({
  name: 'register',
  initialState,
  reducers: {
    /**
     * Sets a single form field and automatically clears its validation error.
     */
    setField<K extends keyof RegisterFormState>(
      state: RegisterFormState,
      action: PayloadAction<{ key: K; value: RegisterFormState[K] }>,
    ) {
      const { key, value } = action.payload
      Object.assign(state, { [key]: value })
      // Auto-clear the validation error for this field (if any).
      const errors = state.errors as Record<string, string | undefined>
      delete errors[key as string]
    },

    setStep(state, action: PayloadAction<number>) {
      state.currentStep = action.payload
    },

    setErrors(state, action: PayloadAction<RegisterErrors>) {
      state.errors = action.payload
    },

    clearError(state, action: PayloadAction<RegisterErrorKey>) {
      delete state.errors[action.payload]
    },

    setGlobalError(state, action: PayloadAction<string | null>) {
      state.globalError = action.payload
    },

    setAnimDir(state, action: PayloadAction<'forward' | 'back'>) {
      state.animDir = action.payload
    },

    incrementAnimKey(state) {
      state.animKey += 1
    },

    setOtpLoading(state, action: PayloadAction<boolean>) {
      state.otpLoading = action.payload
    },

    markOtpSent(state) {
      state.otpSent = true
    },

    verifyPhone(state) {
      state.phoneVerified = true
    },

    verifyEmail(state) {
      state.emailVerified = true
    },

    /** Resets all OTP-related state when the user navigates back to the Contact step. */
    resetOtpState(state) {
      state.phoneOtp = ''
      state.emailOtp = ''
      state.phoneVerified = false
      state.emailVerified = false
      state.phoneVerificationToken = ''
      state.emailVerificationToken = ''
      state.otpSent = false
      state.otpLoading = false
      state.errors = {}
    },

    resetRegisterForm() {
      return initialState
    },
  },
})

export const {
  setField,
  setStep,
  setErrors,
  clearError,
  setGlobalError,
  setAnimDir,
  incrementAnimKey,
  setOtpLoading,
  markOtpSent,
  verifyPhone,
  verifyEmail,
  resetOtpState,
  resetRegisterForm,
} = registerSlice.actions

export default registerSlice.reducer
