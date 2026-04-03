import { Link } from 'react-router-dom'
import { FileText, PillBottle } from 'lucide-react'
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

/** Matches View Report link sizing; pair on one row for scanability. */
const rowActionClass =
  'inline-flex items-center gap-1.5 text-sm font-medium transition-colors'

interface ConsultationHistoryRowProps {
  consultation: ConsultationRecord
}

export function ConsultationHistoryRow({ consultation }: ConsultationHistoryRowProps) {
  const initials = getInitials(consultation.doctorName)
  const statusStyle = STATUS_STYLES[consultation.healthStatus]
  const statusLabel = STATUS_LABELS[consultation.healthStatus]

  const canViewPrescription =
    consultation.prescriptionIssued && consultation.appointmentId

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
      <div className="flex w-full flex-wrap items-center gap-x-5 gap-y-2 sm:w-auto sm:justify-end">
        <Link
          to="/patient/reports"
          className={`link-subtle ${rowActionClass}`}
        >
          <FileText className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          View Report
        </Link>
        {canViewPrescription ? (
          <Link
            to={`/patient/prescriptions?appointment=${encodeURIComponent(consultation.appointmentId!)}`}
            className={`${rowActionClass} text-accent-mint hover:text-accent-mint/85 hover:underline`}
          >
            <PillBottle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            View Prescription
          </Link>
        ) : (
          <span
            className={`${rowActionClass} cursor-default text-text-secondary/55`}
            role="status"
            aria-label="No prescription for this visit"
          >
            <PillBottle
              className="h-4 w-4 shrink-0 text-text-secondary/45"
              strokeWidth={1.5}
            />
            Prescription not issued
          </span>
        )}
      </div>
    </div>
  )
}
