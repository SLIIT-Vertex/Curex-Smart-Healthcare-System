import { ShieldCheck, Activity, Heart, Award } from 'lucide-react'

const LOGO_SRC = '/logo.svg'

const FEATURES = [
  { icon: ShieldCheck, text: 'HIPAA-compliant security',     colorClass: 'text-accent-mint'   },
  { icon: Activity,    text: 'AI-powered symptom checker',   colorClass: 'text-accent-sky'    },
  { icon: Heart,       text: 'Personalised health insights', colorClass: 'text-accent-peach'  },
  { icon: Award,       text: 'No credit card required',      colorClass: 'text-accent-violet' },
]

/**
 * Static left-side brand panel for the registration flow (desktop only).
 * Zero props — purely informational/decorative content.
 */
export const RegisterBrandPanel = () => (
  <div className="auth-brand-panel p-10">
    <div className="auth-blobs-wrap" aria-hidden="true">
      <div className="auth-blob-base auth-blob-reg-1" />
      <div className="auth-blob-base auth-blob-reg-2" />
      <div className="auth-blob-base auth-blob-reg-3" />
    </div>

    <a href="/" className="relative flex items-center gap-3 no-underline">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
        <img src={LOGO_SRC} alt="" className="h-6 w-6" />
      </div>
      <span className="text-xl font-bold tracking-tight text-white">Curex</span>
    </a>

    <div className="relative">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-mint/70 mb-3">
        Join thousands of users
      </p>
      <h2 className="text-balance text-2xl font-semibold leading-relaxed text-white/90">
        Manage your healthcare journey in one intelligent platform.
      </h2>
      <p className="mt-4 text-sm text-white/50">
        Patients get faster care. Doctors spend less time on admin.
      </p>
    </div>

    <ul className="relative flex flex-col gap-3">
      {FEATURES.map(({ icon: Icon, text, colorClass }) => (
        <li key={text} className="flex items-center gap-3 text-sm text-white/70">
          <Icon className={`h-4 w-4 shrink-0 ${colorClass}`} strokeWidth={1.5} />
          {text}
        </li>
      ))}
    </ul>
  </div>
)
