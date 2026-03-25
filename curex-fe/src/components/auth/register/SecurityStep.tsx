import { useCallback } from 'react'
import { CheckCircle2, User, Stethoscope, Phone, Mail } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { setField } from '../../../store/slices/registerSlice'
import { PasswordInput } from '../PasswordInput'
import { Field } from '../Field'
import { NavButtons } from './NavButtons'

/** Computes password strength score (0–5) with a label and colour hex. */
const passwordStrength = (pw: string): { score: number; label: string; color: string } => {
  if (!pw) return { score: 0, label: '', color: '' }
  let s = 0
  if (pw.length >= 8)          s++
  if (pw.length >= 12)         s++
  if (/[A-Z]/.test(pw))        s++
  if (/[0-9]/.test(pw))        s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  const map = [
    { score: 1, label: 'Very weak',  color: '#F87171' },
    { score: 2, label: 'Weak',       color: '#FDBA74' },
    { score: 3, label: 'Fair',       color: '#FCD34D' },
    { score: 4, label: 'Good',       color: '#6EE7B7' },
    { score: 5, label: 'Strong',     color: '#34D399' },
  ]
  return map[Math.min(s, 5) - 1] ?? { score: 0, label: '', color: '' }
}

/**
 * Step 5 — password creation.
 * Zero-param: all state from Redux. Navigates to the Verify step on success.
 */
export const SecurityStep = () => {
  const dispatch = useAppDispatch()
  const form     = useAppSelector(s => s.register)
  const errors   = form.errors

  const handlePasswordChange = useCallback((v: string) => {
    dispatch(setField({ key: 'password', value: v }))
  }, [dispatch])

  const handleConfirmPasswordChange = useCallback((v: string) => {
    dispatch(setField({ key: 'confirmPassword', value: v }))
  }, [dispatch])

  const strength = passwordStrength(form.password)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Create your password</h1>
        <p className="mt-1.5 text-sm text-text-secondary">
          Choose a strong password to keep your account secure.
        </p>
      </div>

      <Field label="Password" error={errors.password}>
        <PasswordInput
          id="password"
          value={form.password}
          onChange={handlePasswordChange}
          placeholder="Min. 8 characters"
          autoComplete="new-password"
        />
        {form.password && (
          <div className="mt-1">
            <div className="pw-strength-track">
              <div
                className="pw-strength-fill"
                style={{ width: `${(strength.score / 5) * 100}%`, backgroundColor: strength.color }}
              />
            </div>
            <p className="text-xs mt-1 font-medium" style={{ color: strength.color }}>
              {strength.label}
            </p>
          </div>
        )}
      </Field>

      <Field label="Confirm password" error={errors.confirmPassword}>
        <PasswordInput
          id="confirmPassword"
          value={form.confirmPassword}
          onChange={handleConfirmPasswordChange}
          placeholder="Re-enter your password"
          autoComplete="new-password"
        />
        {form.confirmPassword && form.password === form.confirmPassword && (
          <p className="text-xs text-status-healthy mt-1 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} /> Passwords match
          </p>
        )}
      </Field>

      {/* Account summary */}
      <div className="rounded-xl border border-text-secondary/12 bg-surface p-4">
        <p className="text-xs font-semibold text-primary mb-3 uppercase tracking-wide">Account summary</p>
        <div className="flex flex-col gap-2 text-sm text-text-secondary">
          <span className="flex items-center gap-2">
            {form.role === 'PATIENT'
              ? <User className="h-4 w-4 text-primary-light" strokeWidth={1.5} />
              : <Stethoscope className="h-4 w-4 text-primary-light" strokeWidth={1.5} />
            }
            <strong className="text-primary">{form.role === 'PATIENT' ? 'Patient' : 'Doctor'}</strong>
          </span>
          <span className="flex items-center gap-2">
            <User className="h-4 w-4 text-text-secondary/60" strokeWidth={1.5} />
            {form.firstName} {form.lastName}
          </span>
          <span className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-text-secondary/60" strokeWidth={1.5} />
            {form.phone}
          </span>
          <span className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-text-secondary/60" strokeWidth={1.5} />
            {form.email}
          </span>
        </div>
      </div>

      <NavButtons />
    </div>
  )
}
