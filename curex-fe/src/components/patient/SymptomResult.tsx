import { Link } from 'react-router-dom'
import { Calendar, AlertTriangle } from 'lucide-react'
import type { SymptomCheckResponse } from '../../types/patient'

const URGENCY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
} as const

interface SymptomResultProps {
  result: SymptomCheckResponse
}

export function SymptomResult({ result }: SymptomResultProps) {
  const urgencyLabel = URGENCY_LABELS[result.urgency]

  return (
    <div className="symptom-result">
      <h3 className="text-lg font-semibold text-primary">Results</h3>

      {/* Urgency badge */}
      <div className="mt-4 flex items-center gap-2">
        <AlertTriangle
          className={`h-5 w-5 shrink-0 ${
            result.urgency === 'high'
              ? 'text-error'
              : result.urgency === 'medium'
                ? 'text-accent-peach'
                : 'text-accent-mint'
          }`}
          strokeWidth={1.5}
        />
        <span className={`urgency-badge urgency-badge--${result.urgency}`}>
          Urgency: {urgencyLabel}
        </span>
      </div>

      {/* Possible conditions */}
      <div className="mt-6">
        <h4 className="text-sm font-semibold text-primary">
          Possible Conditions
        </h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {result.conditions.map((condition, i) => (
            <div key={i} className="condition-card">
              <span className="text-sm font-medium text-primary">
                {i + 1}. {condition}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended specialty */}
      <p className="mt-6 text-sm">
        <span className="font-medium text-text-secondary">
          Recommended Specialty:{' '}
        </span>
        <span className="font-semibold text-primary">{result.specialty}</span>
      </p>

      {/* CTA button */}
      <Link
        to="/patient/appointments"
        className="btn-primary mt-4 inline-flex items-center gap-2"
      >
        <Calendar className="h-4 w-4" strokeWidth={1.5} />
        Book Appointment with a {result.specialty}
      </Link>

      {/* Disclaimer */}
      <p className="mt-6 text-xs text-text-secondary">
        ⚕️ Disclaimer: This is not a medical diagnosis. Please consult a
        qualified healthcare professional.
      </p>
    </div>
  )
}
