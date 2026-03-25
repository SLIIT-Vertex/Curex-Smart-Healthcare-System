import { Link } from 'react-router-dom'
import { Calendar, AlertTriangle, AlertCircle } from 'lucide-react'
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
  const hasEmergencyWarning =
    result.emergencyWarning != null && result.emergencyWarning.trim() !== ''

  return (
    <div className="symptom-result symptom-result-print">
      <h3 className="text-lg font-semibold text-primary">Results</h3>

      {/* Emergency warning — high-visibility alert when applicable */}
      {hasEmergencyWarning && (
        <div
          className="symptom-result__emergency-alert"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle className="h-5 w-5 shrink-0" strokeWidth={2} />
          <div>
            <strong className="block text-sm">Seek Emergency Care</strong>
            <p className="mt-0.5 text-sm">{result.emergencyWarning}</p>
          </div>
        </div>
      )}

      {/* Summary — main takeaway */}
      {result.summary && (
        <p className="mt-4 text-sm leading-relaxed text-primary">
          {result.summary}
        </p>
      )}

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

      {/* Possible conditions + optional possible causes */}
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
        {result.possibleCauses != null && result.possibleCauses.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-text-secondary">
              Possible causes:{' '}
              <span className="font-normal">
                {result.possibleCauses.join('; ')}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Self-care tips */}
      <div className="mt-6">
        <h4 className="text-sm font-semibold text-primary">
          Self-care tips
        </h4>
        {result.selfCareTips != null && result.selfCareTips.length > 0 ? (
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-primary">
            {result.selfCareTips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-text-secondary">
            No specific self-care tips suggested for this analysis.
          </p>
        )}
      </div>

      {/* When to seek care — dedicated callout */}
      {result.whenToSeekCare ? (
        <div className="symptom-result__seek-care-callout mt-6">
          <h4 className="text-sm font-semibold text-primary">
            When to see a doctor
          </h4>
          <p className="mt-1 text-sm text-primary">
            {result.whenToSeekCare}
          </p>
        </div>
      ) : (
        <div className="symptom-result__seek-care-callout mt-6">
          <h4 className="text-sm font-semibold text-primary">
            When to see a doctor
          </h4>
          <p className="mt-1 text-sm text-text-secondary">
            If symptoms persist or worsen, consult a healthcare professional.
          </p>
        </div>
      )}

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
        Book with a {result.specialty}
      </Link>

      {/* Disclaimer — reinforced for compliance */}
      <div className="symptom-result__disclaimer mt-6 rounded-xl border border-text-secondary/20 bg-background/50 px-4 py-3">
        <p className="text-xs font-medium text-text-secondary">
          ⚕️ <strong>Disclaimer:</strong> This is not a medical diagnosis and
          should not replace professional medical advice. Always consult a
          qualified healthcare professional for proper evaluation and treatment.
        </p>
      </div>
    </div>
  )
}
