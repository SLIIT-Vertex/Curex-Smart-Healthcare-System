import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { authService } from '../../services/authService'
import { useAppDispatch, useToast } from '../../store/hooks'
import { setCredentials } from '../../store/slices/authSlice'
import { ROLE_HOME } from '../../components/auth/ProtectedRoute'
import type { Role } from '../../types/auth'

const LOGO_SRC = '/logo.svg'

export function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFieldError(null)

    if (!email.trim() || !password) {
      setFieldError('Please enter your email and password.')
      return
    }

    setIsLoading(true)
    try {
      const response = await authService.login({ email: email.trim(), password })
      dispatch(setCredentials(response))
      toast('Welcome back!', 'success')
      const role = response.user.role as Role
      navigate(from ?? ROLE_HOME[role], { replace: true })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Invalid email or password.'
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
          <blockquote className="text-balance text-2xl font-medium leading-relaxed text-surface/90">
            "Your health data, your care team, and your appointments — all in one secure place."
          </blockquote>
          <p className="mt-4 text-sm text-surface/50">
            AI-Enabled Smart Healthcare Platform
          </p>
        </div>

        <ul className="flex flex-col gap-3 text-sm text-surface/60">
          {[
            'End-to-end encrypted data',
            'Role-based access control',
            'Real-time appointment updates',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-mint" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/*  Right form panel  */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
        {/* Mobile logo */}
        <a href="/" className="mb-8 flex items-center gap-2 no-underline lg:hidden">
          <img src={LOGO_SRC} alt="" width={32} height={32} className="h-8 w-8" />
          <span className="text-lg font-semibold tracking-tight text-primary">Curex</span>
        </a>

        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-primary">
            Sign in to Curex
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-primary-light hover:underline">
              Create one
            </Link>
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5">
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

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-primary">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="auth-input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary transition-colors hover:text-primary"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            {/* Field error */}
            {fieldError && (
              <p role="alert" className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
                {fieldError}
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
                <LogIn className="h-4 w-4" strokeWidth={1.75} />
              )}
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
