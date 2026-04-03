import { useState, useMemo } from 'react'
import { WelcomeBanner } from '../../components/patient/WelcomeBanner'
import { MedicalDetailsCard } from '../../components/patient/MedicalDetailsCard'
import { QuickActions } from '../../components/patient/QuickActions'
import { ConsultationHistoryRow } from '../../components/patient/ConsultationHistoryRow'
import { useAuth } from '../../store/hooks'
import { useMyProfile } from '../../hooks/useMyProfile'
import type {
  ConsultationRecord,
  MedicalDetailsSnapshot,
} from '../../types/patient'

const MOCK_CONSULTATIONS: ConsultationRecord[] = [
  {
    id: '1',
    doctorId: 'd1',
    doctorName: 'Dr. Silva',
    doctorSpecialty: 'General Practitioner',
    date: '23 Mar 2026',
    visitType: 'Routine Checkup',
    healthStatus: 'GOOD',
    healthScore: 88,
    reportId: 'r1',
    prescriptionIssued: true,
    appointmentId: 'apt1',
  },
  {
    id: '2',
    doctorId: 'd2',
    doctorName: 'Dr. Khan',
    doctorSpecialty: 'Cardiology',
    date: '18 Mar 2026',
    visitType: 'Cardiology',
    healthStatus: 'GOOD',
    healthScore: 90,
    reportId: 'r2',
    prescriptionIssued: true,
    appointmentId: 'apt2',
  },
  {
    id: '3',
    doctorId: 'd3',
    doctorName: 'Dr. Perera',
    doctorSpecialty: 'Neurology',
    date: '10 Mar 2026',
    visitType: 'Follow-up',
    healthStatus: 'FAIR',
    healthScore: 72,
    reportId: 'r3',
    prescriptionIssued: false,
  },
]

function computeAge(dob?: string): string | null {
  if (!dob) return null
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return String(age)
}

function formatGender(gender?: string): string | null {
  if (!gender) return null
  return gender[0] + gender.slice(1).toLowerCase()
}

function parseCsvField(value?: string): string[] {
  if (!value) return []
  return value.split(',').map((s) => s.trim()).filter(Boolean)
}

type SortOrder = 'new-to-old' | 'old-to-new'

export function PatientDashboard() {
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useMyProfile()
  const [sortOrder, setSortOrder] = useState<SortOrder>('new-to-old')

  const patientName = user?.firstName ?? 'there'

  const medicalDetails: MedicalDetailsSnapshot = useMemo(() => ({
    age: computeAge(profile?.dob),
    bloodGroup: profile?.bloodGroup ?? null,
    gender: formatGender(profile?.gender),
    allergies: parseCsvField(profile?.allergies),
    chronicConditions: parseCsvField(profile?.chronicConditions),
  }), [profile?.dob, profile?.bloodGroup, profile?.gender, profile?.allergies, profile?.chronicConditions])

  const sortedConsultations = useMemo(() => {
    const sorted = [...MOCK_CONSULTATIONS]
    if (sortOrder === 'old-to-new') {
      sorted.reverse()
    }
    return sorted
  }, [sortOrder])

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Welcome banner + Details card — side by side on desktop */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <WelcomeBanner patientName={patientName} />
        <MedicalDetailsCard details={medicalDetails} loading={profileLoading} />
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="section-heading mb-2">Quick actions</h2>
        <p className="section-subtext">
          Book appointments, join video consultations, upload reports, review your
          prescriptions, and get AI-powered health suggestions—your everyday care,
          streamlined in one place.
        </p>
        <div className="mt-4">
          <QuickActions />
        </div>
      </section>

      {/* Consultation History */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="section-heading mb-2">Consultation History</h2>
            <p className="section-subtext">
              Your recent consultations and health reports.
            </p>
          </div>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="patient-page-select"
            aria-label="Sort order"
          >
            <option value="new-to-old">New to Old</option>
            <option value="old-to-new">Old to New</option>
          </select>
        </div>

        <div className="mt-4 space-y-3">
          {sortedConsultations.length > 0 ? (
            sortedConsultations.map((consultation) => (
              <ConsultationHistoryRow
                key={consultation.id}
                consultation={consultation}
              />
            ))
          ) : (
            <div className="patient-empty-state">
              <p className="text-text-secondary">
                No consultations yet — book your first appointment!
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
