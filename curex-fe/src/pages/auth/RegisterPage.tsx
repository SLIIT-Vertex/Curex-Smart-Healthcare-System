import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, UserPlus, Stethoscope, User } from 'lucide-react'
import { authService } from '../../services/authService'
import { useAppDispatch, useToast } from '../../store/hooks'
import { setCredentials } from '../../store/slices/authSlice'
import { ROLE_HOME } from '../../components/auth/ProtectedRoute'
import type { Role } from '../../types/auth'

const LOGO_SRC = '/logo.svg'

type RoleOption = Extract<Role, 'PATIENT' | 'DOCTOR'>

const ROLE_OPTIONS: { value: RoleOption; label: string; description: string; icon: typeof User }[] =
  [
    {
      value: 'PATIENT',
      label: 'Patient',
      description: 'Book appointments and manage your health',
      icon: User,
    },
    {
      value: 'DOCTOR',
      label: 'Doctor',
      description: 'Manage your practice and see patients',
      icon: Stethoscope,
    },
  ]

export function RegisterPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [role, setRole] = useState<RoleOption>('PATIENT')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [specialty, setSpecialty] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFieldError(null)

    if (password.length < 8) {
      setFieldError('Password must be at least 8 characters.')
      return
    }

    setIsLoading(true)
    try {
      const response = await authService.register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phone.trim() || undefined,
        role,
        specialty: role === 'DOCTOR' ? specialty.trim() || undefined : undefined,
        medicalLicenseNumber:
          role === 'DOCTOR' ? licenseNumber.trim() || undefined : undefined,
      })
      dispatch(setCredentials(response))
      toast('Account created! Welcome to Curex.', 'success')
      navigate(ROLE_HOME[role], { replace: true })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Registration failed. Please try again.'
      setFieldError(msg)
      toast(msg, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh bg-background">
      {/*  Left brand panel  */}
      <div className="hidden flex-col justify-between bg-primary p-10 lg:flex lg:w-[42%]">
        <a href="/" className="flex items-center gap-2.5 no-underline">
          <img src={LOGO_SRC} alt="" width={36} height={36} className="h-9 w-9" />
          <span className="text-xl font-semibold tracking-tight text-surface">Curex</span>
        </a>

        <div>
          <h2 className="text-balance text-2xl font-semibold text-surface/90">
            Join thousands who manage their healthcare in one place.
          </h2>
          <p className="mt-4 text-sm text-surface/50">
            Patients get faster care. Doctors spend less time on admin.
          </p>
        </div>

        <ul className="flex flex-col gap-3 text-sm text-surface/60">
          {['Free to get started', 'HIPAA-compliant security', 'No credit card required'].map(
            (item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-mint" />
                {item}
              </li>
            ),
          )}
        </ul>
      </div>

      {/*  Right form panel  */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
        <a href="/" className="mb-8 flex items-center gap-2 no-underline lg:hidden">
          <img src={LOGO_SRC} alt="" width={32} height={32} className="h-8 w-8" />
          <span className="text-lg font-semibold tracking-tight text-primary">Curex</span>
        </a>

        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-primary">
            Create your account
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            Already have one?{' '}
            <Link to="/login" className="font-medium text-primary-light hover:underline">
              Sign in
            </Link>
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5">
            {/* Role selector */}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-primary">I am a…</span>
              <div className="grid grid-cols-2 gap-2.5">
                {ROLE_OPTIONS.map(({ value, label, description, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRole(value)}
                    className={`
                      flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all
                      ${
                        role === value
                          ? 'border-primary-light bg-primary-light/8 shadow-sm'
                          : 'border-text-secondary/20 bg-surface hover:border-primary-light/40'
                      }
                    `}
                  >
                    <Icon
                      className={`h-5 w-5 ${role === value ? 'text-primary-light' : 'text-text-secondary'}`}
                      strokeWidth={1.5}
                    />
                    <span
                      className={`text-sm font-semibold ${role === value ? 'text-primary' : 'text-text-secondary'}`}
                    >
                      {label}
                    </span>
                    <span className="text-xs leading-tight text-text-secondary">
                      {description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="firstName" className="text-sm font-medium text-primary">
                  First name
                </label>
                <input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  required
                  className="auth-input"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="lastName" className="text-sm font-medium text-primary">
                  Last name
                </label>
                <input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  required
                  className="auth-input"
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-primary">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="auth-input"
              />
            </div>

            {/* Phone */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="text-sm font-medium text-primary">
                Phone{' '}
                <span className="font-normal text-text-secondary">(optional)</span>
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+94 77 000 0000"
                className="auth-input"
              />
            </div>

            {/* Doctor-only fields */}
            {role === 'DOCTOR' && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="specialty" className="text-sm font-medium text-primary">
                    Specialty{' '}
                    <span className="font-normal text-text-secondary">(optional)</span>
                  </label>
                  <input
                    id="specialty"
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="e.g. Cardiology"
                    className="auth-input"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="licenseNumber" className="text-sm font-medium text-primary">
                    Medical licence no.{' '}
                    <span className="font-normal text-text-secondary">(optional)</span>
                  </label>
                  <input
                    id="licenseNumber"
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="e.g. MC-12345"
                    className="auth-input"
                  />
                </div>
              </>
            )}

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-primary">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  className="auth-input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </button>
              </div>
              {password.length > 0 && password.length < 8 && (
                <p className="text-xs text-status-attention">
                  {8 - password.length} more character{8 - password.length !== 1 ? 's' : ''} needed
                </p>
              )}
            </div>

            {/* Field error */}
            {fieldError && (
              <p role="alert" className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
                {fieldError}
              </p>
            )}

            {role === 'DOCTOR' && (
              <p className="rounded-lg bg-accent-peach/15 px-3 py-2.5 text-xs leading-relaxed text-text-secondary">
                Doctor accounts require admin approval before you can see patients. You'll receive an
                email when your account is verified.
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary mt-1 w-full justify-center gap-2 py-3 disabled:opacity-60"
            >
              {isLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-surface/30 border-t-surface" />
              ) : (
                <UserPlus className="h-4 w-4" strokeWidth={1.75} />
              )}
              {isLoading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
