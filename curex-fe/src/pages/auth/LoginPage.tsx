import {
  useState, useRef, useEffect, useCallback,
  type ChangeEvent, type KeyboardEvent,
} from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'
import { authService } from '../../services/authService'
import { useAppDispatch, useAppSelector, useToast } from '../../store/hooks'
import { setCredentials, setLoading } from '../../store/slices/authSlice'
import { ROLE_HOME } from '../../components/auth/ProtectedRoute'
import { LoginBrandPanel } from '../../components/auth/LoginBrandPanel'
import type { Role } from '../../types/auth'

type LoginStep = 'email' | 'password'

/** Basic email format check. */
const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

/**
 * Two-step login wizard (email → password).
 *
 * - Loading state lives in Redux (authSlice.isLoading).
 * - Transient UI state (step, field values, error, animation key) stays local
 *   because it only matters for this single session and resets on navigate.
 */
export const LoginPage = () => {
  const dispatch  = useAppDispatch()
  const navigate  = useNavigate()
  const location  = useLocation()
  const { toast } = useToast()
  const isLoading = useAppSelector(s => s.auth.isLoading)

  const [step, setStep]                 = useState<LoginStep>('email')
  const [animDir, setAnimDir]           = useState<'forward' | 'back'>('forward')
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldError, setFieldError]     = useState<string | null>(null)
  const [animKey, setAnimKey]           = useState(0)

  const emailRef    = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname

  useEffect(() => {
    if (step === 'email') emailRef.current?.focus()
    else passwordRef.current?.focus()
  }, [step])

  const goToPassword = useCallback(() => {
    if (!isValidEmail(email)) { setFieldError('Please enter a valid email address.'); return }
    setFieldError(null)
    setAnimDir('forward')
    setAnimKey(k => k + 1)
    setStep('password')
  }, [email])

  const goBackToEmail = useCallback(() => {
    setFieldError(null)
    setAnimDir('back')
    setAnimKey(k => k + 1)
    setStep('email')
  }, [])

  const handleEmailChange    = useCallback((e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value), [])
  const handlePasswordChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value), [])
  const toggleShowPassword   = useCallback(() => setShowPassword(v => !v), [])

  const handleEmailKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); goToPassword() }
  }, [goToPassword])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 'email') { goToPassword(); return }
    if (!password) { setFieldError('Please enter your password.'); return }

    setFieldError(null)
    dispatch(setLoading(true))
    try {
      const response = await authService.login({ email: email.trim(), password })
      dispatch(setCredentials(response))
      toast('Welcome back!', 'success')
      navigate(from ?? ROLE_HOME[response.user.role as Role], { replace: true })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Invalid email or password.'
      setFieldError(msg)
      toast(msg, 'error')
    } finally {
      dispatch(setLoading(false))
    }
  }, [step, password, email, from, dispatch, navigate, toast, goToPassword])

  const animClass = animDir === 'forward' ? 'auth-step-enter-forward' : 'auth-step-enter-back'

  return (
    <div className="flex min-h-dvh bg-background">
      <LoginBrandPanel />

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <a href="/" className="mb-10 flex items-center gap-2.5 no-underline lg:hidden">
          <img src="/logo.svg" alt="" className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight text-primary">Curex</span>
        </a>

        <div className="w-full max-w-[360px]">
          {/* Step progress bar */}
          <div className="auth-step-bar gap-1.5">
            {(['email', 'password'] as LoginStep[]).map((s, i) => (
              <div
                key={s}
                className={`auth-step-segment ${
                  step === 'email'    && i === 0 ? 'active'
                  : step === 'password' && i === 0 ? 'done'
                  : step === 'password' && i === 1 ? 'active'
                  : 'todo'
                }`}
              />
            ))}
          </div>

          <form
            key={animKey}
            className={`${animClass} flex flex-col gap-5`}
            onSubmit={handleSubmit}
            noValidate
            data-testid="login-form"
          >
            {step === 'email' ? (
              <>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-primary">Sign in to Curex</h1>
                  <p className="mt-1.5 text-sm text-text-secondary">
                    Don't have an account?{' '}
                    <Link to="/register" className="font-semibold text-primary-light hover:underline">
                      Create one
                    </Link>
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-sm font-semibold text-primary">Email address</label>
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
                  <p role="alert" className="rounded-xl bg-error/10 px-3 py-2.5 text-sm text-error">{fieldError}</p>
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

                  <h1 className="mt-3 text-2xl font-bold tracking-tight text-primary">Enter your password</h1>
                  <p className="mt-1 text-sm text-text-secondary">Sign in to your Curex account</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-semibold text-primary">Password</label>
                    <span className="text-xs text-text-secondary hover:text-primary cursor-pointer transition-colors">
                      Forgot password?
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      ref={passwordRef}
                      id="password"
                      type={showPassword ? 'text' : 'password'}
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
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary transition-colors hover:text-primary"
                      data-testid="login-toggle-password"
                    >
                      {showPassword
                        ? <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                        : <Eye    className="h-4 w-4" strokeWidth={1.5} />
                      }
                    </button>
                  </div>
                </div>

                {fieldError && (
                  <p role="alert" className="rounded-xl bg-error/10 px-3 py-2.5 text-sm text-error">{fieldError}</p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary mt-1 w-full justify-center gap-2.5 py-3 text-base disabled:opacity-60"
                  data-testid="login-submit-button"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isLoading ? 'Signing in…' : 'Sign in'}
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
