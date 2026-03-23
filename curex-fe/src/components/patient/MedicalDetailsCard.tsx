import { Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import type { MedicalDetailsSnapshot } from '../../types/patient'

interface MedicalDetailsCardProps {
  details: MedicalDetailsSnapshot
}

export function MedicalDetailsCard({ details }: MedicalDetailsCardProps) {
  const allergiesDisplay =
    details.allergies.length > 0 ? details.allergies.join(', ') : 'None'
  const conditionsDisplay =
    details.knownConditions.length > 0
      ? details.knownConditions.join(', ')
      : 'None'
  const lastCheckupDisplay = details.lastCheckup ?? '—'

  return (
    <div className="details-card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Details</h3>
        <Link to="/patient/profile" aria-label="Edit details">
          <Pencil
            className="h-4 w-4 text-surface/70 transition-colors hover:text-surface"
            strokeWidth={1.5}
          />
        </Link>
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt>Age Group</dt>
          <dd>{details.ageGroup}</dd>
        </div>
        <div>
          <dt>Blood Type</dt>
          <dd>{details.bloodType}</dd>
        </div>
        <div>
          <dt>Allergies</dt>
          <dd>{allergiesDisplay}</dd>
        </div>
        <div>
          <dt>Conditions</dt>
          <dd>{conditionsDisplay}</dd>
        </div>
        <div>
          <dt>Last checkup</dt>
          <dd>{lastCheckupDisplay}</dd>
        </div>
      </dl>
    </div>
  )
}
