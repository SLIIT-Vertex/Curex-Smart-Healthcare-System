import { Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import type { MedicalDetailsSnapshot } from '../../types/patient'

interface MedicalDetailsCardProps {
  details: MedicalDetailsSnapshot
  loading?: boolean
}

const NOT_PROVIDED = 'Not provided'

function valueClass(v: string) {
  return v === NOT_PROVIDED ? 'details-card__value-muted' : undefined
}

export function MedicalDetailsCard({ details, loading }: MedicalDetailsCardProps) {
  if (loading) {
    return (
      <div className="details-card animate-pulse">
        <div className="details-card__header">
          <div className="relative z-[1] h-3 w-16 rounded bg-white/20" />
          <div className="relative z-[1] h-3.5 w-3.5 rounded bg-white/20" />
        </div>
        <div className="details-card__body">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="details-card__row">
              <div className="h-2.5 w-20 rounded bg-text-secondary/15" />
              <div className="mt-1 h-3 w-24 rounded bg-text-secondary/10" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const allergiesDisplay =
    details.allergies.length > 0 ? details.allergies.join(', ') : NOT_PROVIDED
  const conditionsDisplay =
    details.chronicConditions.length > 0 ? details.chronicConditions.join(', ') : NOT_PROVIDED

  const age = details.age ?? NOT_PROVIDED
  const blood = details.bloodGroup ?? NOT_PROVIDED
  const gender = details.gender ?? NOT_PROVIDED

  const rows: { label: string; value: string }[] = [
    { label: 'Age', value: age },
    { label: 'Blood Group', value: blood },
    { label: 'Gender', value: gender },
    { label: 'Known Allergies', value: allergiesDisplay },
    { label: 'Chronic Conditions', value: conditionsDisplay },
  ]

  return (
    <div className="details-card">
      <div className="details-card__header">
        <h3 className="details-card__header-title">Details</h3>
        <Link
          to="/patient/profile"
          className="details-card__edit"
          aria-label="Edit details"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Link>
      </div>
      <div className="details-card__body">
        <dl>
          {rows.map(({ label, value }) => (
            <div key={label} className="details-card__row">
              <dt>{label}</dt>
              <dd className={valueClass(value)}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
