import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import type { ConsultationRecord } from '../../types/patient'

function getInitials(name: string): string {
  const words = name.replace(/Dr\.\s*/i, '').trim().split(/\s+/)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  const word = words[0] ?? ''
  return word.slice(0, 2).toUpperCase()
}

const STATUS_STYLES = {
  GOOD: 'bg-accent-mint/20 border-accent-mint/40 text-primary',
  FAIR: 'bg-accent-peach/20 border-accent-peach/40 text-primary',
  CRITICAL: 'bg-error/20 border-error/40 text-primary',
} as const

const STATUS_LABELS = {
  GOOD: 'Good',
  FAIR: 'Fair',
  CRITICAL: 'Critical',
} as const

interface ConsultationHistoryRowProps {
  consultation: ConsultationRecord
}

export function ConsultationHistoryRow({ consultation }: ConsultationHistoryRowProps) {
  const initials = getInitials(consultation.doctorName)
  const statusStyle = STATUS_STYLES[consultation.healthStatus]
  const statusLabel = STATUS_LABELS[consultation.healthStatus]

  return (
    <div className="consultation-row">
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light/20 text-xs font-semibold text-primary"
          aria-hidden
        >
          {initials}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-medium text-primary">
            {consultation.doctorName}
          </span>
          <span className="text-sm text-text-secondary">
            {consultation.date}
          </span>
          <span className="text-sm text-text-secondary">
            {consultation.visitType}
          </span>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyle}`}
          >
            {statusLabel}
          </span>
        </div>
      </div>
      <Link
        to="/patient/reports"
        className="link-subtle inline-flex items-center gap-1.5 text-sm font-medium"
      >
        <FileText className="h-4 w-4" strokeWidth={1.5} />
        View Report
      </Link>
    </div>
  )
}
