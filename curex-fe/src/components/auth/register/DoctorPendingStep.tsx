import { Fragment } from 'react'
import { Check, Clock, ShieldCheck, Mail, LogIn } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { resetRegisterForm } from '../../../store/slices/registerSlice'
import { useNavigate } from 'react-router-dom'

const LOGO_SRC    = '/logo.svg'
const STEP_LABELS = ['Role', 'Personal', 'Details', 'Contact', 'Security', 'Verify']

/**
 * Shown inline inside RegisterPage after a DOCTOR completes registration.
 * Replaces the step wizard with a pending-approval confirmation section,
 * keeping the same two-column layout (brand panel + content column).
 */
export const DoctorPendingStep = () => {
  const dispatch   = useAppDispatch()
  const form       = useAppSelector(s => s.register)
  const user       = useAppSelector(s => s.auth.user)
  const navigate   = useNavigate()

  const handleSignIn = () => {
    dispatch(resetRegisterForm())
    navigate('/login')
  }

  return (
    <div className="my-auto w-full max-w-[440px] px-6 py-10">

      {/* Mobile logo */}
      <a href="/" className="mb-8 flex items-center gap-2.5 no-underline lg:hidden">
        <img src={LOGO_SRC} alt="" className="h-8 w-8" />
        <span className="text-lg font-bold tracking-tight text-primary">Curex</span>
      </a>

      {/* All steps shown as completed */}
      <div className="mb-8">
        <div className="flex items-center">
          {STEP_LABELS.map((label, i) => {
            const isLast = i === STEP_LABELS.length - 1
            return (
              <Fragment key={label}>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="register-step-dot done">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </div>
                  <span className="hidden sm:block text-[9px] font-medium uppercase tracking-wide text-primary-light">
                    {label}
                  </span>
                </div>
                {!isLast && <div className="register-step-line done" />}
              </Fragment>
            )
          })}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-base font-semibold text-primary">Registration Complete</p>
          <span className="rounded-full bg-status-healthy/10 px-2.5 py-0.5 text-[11px] font-medium text-status-healthy">
            ✓ Submitted
          </span>
        </div>
      </div>

      {/* Pending approval content */}
      <div className="auth-fade-in flex flex-col gap-5">

        {/* Status icon + heading */}
        <div className="flex flex-col items-center text-center gap-3 pb-1">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
            <Clock className="h-8 w-8 text-amber-500" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">Application Under Review</h1>
            <p className="mt-1.5 text-sm text-text-secondary leading-relaxed">
              Thank you,{' '}
              <span className="font-semibold text-primary">
                {user?.firstName ?? form.firstName ?? 'Doctor'}
              </span>
              . Your account has been created and is now pending admin approval.
            </p>
          </div>
        </div>

        {/* What happens next */}
        <div className="rounded-xl bg-primary/5 border border-primary/10 p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <ShieldCheck className="h-5 w-5 text-primary-light" strokeWidth={1.5} />
            <p className="text-sm font-semibold text-primary">What happens next?</p>
          </div>
          <ul className="space-y-2.5 text-sm text-text-secondary">
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary-light">1</span>
              <span>Our admin team will review your credentials and uploaded documents.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary-light">2</span>
              <span>Verification typically takes <strong className="text-primary">1–2 business days</strong>.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary-light">3</span>
              <span>Once approved, you'll have full access to the doctor dashboard.</span>
            </li>
          </ul>
        </div>

        {/* Email notification */}
        <div className="rounded-xl bg-accent-sky/8 border border-accent-sky/20 p-5">
          <div className="flex items-center gap-2.5 mb-2">
            <Mail className="h-5 w-5 text-accent-sky" strokeWidth={1.5} />
            <p className="text-sm font-semibold text-primary">We'll notify you</p>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">
            You'll receive an email at{' '}
            <span className="font-medium text-primary">
              {user?.email ?? form.email ?? 'your registered email'}
            </span>{' '}
            once your account has been approved.
          </p>
        </div>

        {/* Pending badge + sign out */}
        <div className="flex flex-col items-center gap-4 pt-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-2">
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Pending Approval</span>
          </div>

          <button
            onClick={handleSignIn}
            className="flex items-center gap-2 rounded-xl border border-text-secondary/15 px-6 py-2.5 text-sm font-medium text-text-secondary hover:border-primary/30 hover:text-primary transition-colors"
          >
            <LogIn className="h-4 w-4" strokeWidth={1.5} />
            Sign In
          </button>
        </div>

        <p className="text-center text-xs text-text-secondary/50">
          Need help?{' '}
          <a href="mailto:support@curex.com" className="text-primary-light hover:underline">
            support@curex.com
          </a>
        </p>

      </div>
    </div>
  )
}
