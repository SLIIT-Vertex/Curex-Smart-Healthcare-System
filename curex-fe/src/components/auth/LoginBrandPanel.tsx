import { ShieldCheck, Activity, Calendar, Stethoscope } from 'lucide-react'

const LOGO_SRC = '/logo.svg'

const FEATURES = [
  { icon: ShieldCheck,  text: 'End-to-end encrypted data',    sub: 'HIPAA-compliant security' },
  { icon: Activity,     text: 'Real-time health monitoring',   sub: 'AI-powered insights' },
  { icon: Calendar,     text: 'Smart appointment scheduling',  sub: 'No more waiting rooms' },
  { icon: Stethoscope,  text: 'Connect with top specialists', sub: 'On-demand telemedicine' },
]

/**
 * Static left-side brand panel for the login page (desktop only).
 * Zero props — purely informational/decorative content.
 */
export const LoginBrandPanel = () => (
  <div className="auth-brand-panel p-10">
    <div className="auth-blobs-wrap" aria-hidden="true">
      <div className="auth-blob-base auth-blob-login-1" />
      <div className="auth-blob-base auth-blob-login-2" />
      <div className="auth-blob-base auth-blob-login-3" />
    </div>

    <a href="/" className="relative flex items-center gap-3 no-underline">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
        <img src={LOGO_SRC} alt="" className="h-6 w-6" />
      </div>
      <span className="text-xl font-bold tracking-tight text-white">Curex</span>
    </a>

    <div className="relative">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-mint/70 mb-3">
        AI-Enabled Smart Healthcare
      </p>
      <blockquote className="text-balance text-2xl font-semibold leading-relaxed text-white/90">
        "Your health data, your care team, and your appointments — all in one secure place."
      </blockquote>
    </div>

    <ul className="relative grid grid-cols-2 gap-3">
      {FEATURES.map(({ icon: Icon, text, sub }) => (
        <li
          key={text}
          className="flex flex-col gap-1 rounded-xl bg-white/8 p-3 backdrop-blur-sm border border-white/10"
        >
          <Icon className="h-4 w-4 text-accent-mint" strokeWidth={1.5} />
          <span className="text-xs font-semibold text-white/90 leading-tight">{text}</span>
          <span className="text-xs text-white/50">{sub}</span>
        </li>
      ))}
    </ul>
  </div>
)
