import type { LucideIcon } from 'lucide-react'

export interface StatCardProps {
  label: string
  value: number | string
  trend?: string
  accent: 'sky' | 'peach' | 'mint' | 'primary-light'
  icon: LucideIcon
}

const ACCENT_CLASSES = {
  sky: {
    strip: 'bg-accent-sky',
    iconBg: 'bg-accent-sky/15',
    iconColor: 'text-accent-sky',
    trendColor: 'text-status-healthy',
  },
  peach: {
    strip: 'bg-accent-peach',
    iconBg: 'bg-accent-peach/15',
    iconColor: 'text-accent-peach',
    trendColor: 'text-status-attention',
  },
  mint: {
    strip: 'bg-accent-mint',
    iconBg: 'bg-accent-mint/15',
    iconColor: 'text-accent-mint',
    trendColor: 'text-status-healthy',
  },
  'primary-light': {
    strip: 'bg-primary-light',
    iconBg: 'bg-primary-light/15',
    iconColor: 'text-primary-light',
    trendColor: 'text-primary',
  },
} as const

export function StatCard({ label, value, trend, accent, icon: Icon }: StatCardProps) {
  const classes = ACCENT_CLASSES[accent]

  return (
    <div
      className="stat-card relative overflow-hidden rounded-2xl bg-surface transition-transform hover:scale-[1.02]"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div
        className={`stat-card__accent absolute inset-y-0 left-0 w-1 ${classes.strip}`}
        aria-hidden
      />
      <div className="flex items-start gap-4 p-5">
        <div
          className={`stat-card__icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${classes.iconBg}`}
        >
          <Icon className={`h-5 w-5 ${classes.iconColor}`} strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-text-secondary">{label}</p>
          <p className="mt-1 text-3xl font-bold text-primary">{value}</p>
          {trend && (
            <p className={`mt-0.5 text-xs ${classes.trendColor}`}>{trend}</p>
          )}
        </div>
      </div>
    </div>
  )
}
