import { Clock, ShieldCheck, Mail, LogOut } from 'lucide-react'
import { useAppSelector, useAuthActions } from '../../store/hooks'

/**
 * Shown to newly registered doctors whose accounts are still PENDING admin approval.
 * Provides a clear status message and sets expectations for the approval process.
 */
export const DoctorPendingPage = () => {
  const { logout } = useAuthActions()
  const user = useAppSelector((s) => s.auth.user)

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="rounded-2xl border border-text-secondary/10 bg-card-bg shadow-lg overflow-hidden">
          {/* Gradient header accent */}
          <div className="h-2 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500" />

          <div className="px-8 py-10 flex flex-col items-center text-center">
            {/* Status icon */}
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 mb-6">
              <Clock className="h-10 w-10 text-amber-500" strokeWidth={1.5} />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-primary mb-2">
              Application Under Review
            </h1>
            <p className="text-text-secondary text-sm leading-relaxed max-w-md">
              Thank you for registering, <span className="font-semibold text-primary">{user?.firstName ?? 'Doctor'}</span>. 
              Your account has been created successfully and is now pending admin approval.
            </p>

            {/* Info sections */}
            <div className="mt-8 w-full flex flex-col gap-4">
              {/* What happens next */}
              <div className="rounded-xl bg-primary/5 border border-primary/10 p-5 text-left">
                <div className="flex items-center gap-2.5 mb-3">
                  <ShieldCheck className="h-5 w-5 text-primary-light" strokeWidth={1.5} />
                  <p className="text-sm font-semibold text-primary">What happens next?</p>
                </div>
                <ul className="space-y-2.5 text-sm text-text-secondary">
                  <li className="flex items-start gap-2.5">
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary-light">1</span>
                    <span>Our admin team will review your credentials and uploaded documents.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary-light">2</span>
                    <span>Verification typically takes <strong className="text-primary">1–2 business days</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary-light">3</span>
                    <span>Once approved, you'll have full access to the doctor dashboard.</span>
                  </li>
                </ul>
              </div>

              {/* Email notification */}
              <div className="rounded-xl bg-accent-sky/8 border border-accent-sky/20 p-5 text-left">
                <div className="flex items-center gap-2.5 mb-2">
                  <Mail className="h-5 w-5 text-accent-sky" strokeWidth={1.5} />
                  <p className="text-sm font-semibold text-primary">We'll notify you</p>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  You'll receive an email at <span className="font-medium text-primary">{user?.email ?? 'your registered email'}</span> once 
                  your account has been approved. You can then log in and start seeing patients.
                </p>
              </div>
            </div>

            {/* Status badge */}
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-2">
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Pending Approval</span>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="mt-8 flex items-center gap-2 rounded-xl border border-text-secondary/15 px-6 py-2.5 text-sm font-medium text-text-secondary hover:border-primary/30 hover:text-primary transition-colors"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
              Sign out
            </button>
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-text-secondary/60">
          Need help? Contact our support team at{' '}
          <a href="mailto:support@curex.com" className="text-primary-light hover:underline">
            support@curex.com
          </a>
        </p>
      </div>
    </div>
  )
}
