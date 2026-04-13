import { Sparkles, CheckCircle2, HelpCircle } from 'lucide-react'

type LegacyMode = 'hide' | 'dash' | 'hint'

export type VisitPhaseAtIssueBadgeProps = {
  /** Snapshot from doctor-service when the prescription was issued. */
  visitStatusAtIssue?: string | null
  /**
   * - `hide` — render nothing when unknown (compact lists).
   * - `dash` — show an em dash for older records.
   * - `hint` — em dash plus short accessibility-friendly explanation.
   */
  legacyMode?: LegacyMode
  /** Smaller, single-line chip for dense tables. */
  compact?: boolean
  className?: string
}

function chipBase(compact: boolean): string {
  return compact
    ? 'inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight'
    : 'inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-snug'
}

/**
 * Explains whether the prescription was written during the live visit or after it ended.
 * Distinct from the appointment’s **current** status (e.g. a completed visit may still show
 * “issued during visit” if the doctor wrote it while IN_SESSION).
 */
export function VisitPhaseAtIssueBadge({
  visitStatusAtIssue,
  legacyMode = 'hide',
  compact = false,
  className = '',
}: VisitPhaseAtIssueBadgeProps) {
  const v = visitStatusAtIssue?.trim()

  if (v === 'IN_SESSION') {
    return (
      <span
        className={`${chipBase(compact)} border border-accent-mint/40 bg-accent-mint/20 text-primary shadow-sm ${className}`.trim()}
        title="This prescription was saved while the visit was still in progress."
      >
        <Sparkles
          className={`shrink-0 text-emerald-700/90 ${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`}
          strokeWidth={2}
          aria-hidden
        />
        Issued during visit
      </span>
    )
  }

  if (v === 'COMPLETED') {
    return (
      <span
        className={`${chipBase(compact)} border border-accent-sky/45 bg-accent-sky/22 text-primary shadow-sm ${className}`.trim()}
        title="This prescription was saved after the visit was marked complete."
      >
        <CheckCircle2
          className={`shrink-0 text-sky-800/85 ${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`}
          strokeWidth={2}
          aria-hidden
        />
        Issued after visit
      </span>
    )
  }

  if (legacyMode === 'hide') return null

  const title =
    legacyMode === 'hint'
      ? 'Older prescriptions may not include visit timing. New scripts show whether they were written during or after the visit.'
      : 'Visit timing not recorded for this prescription.'

  return (
    <span
      className={`inline-flex items-center gap-1 text-text-secondary ${compact ? 'text-[10px]' : 'text-xs'} ${className}`.trim()}
      title={title}
    >
      {legacyMode === 'hint' ? (
        <HelpCircle
          className={`shrink-0 opacity-70 ${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`}
          strokeWidth={2}
          aria-hidden
        />
      ) : null}
      <span className="font-medium tabular-nums">—</span>
      <span className="sr-only">{title}</span>
    </span>
  )
}
