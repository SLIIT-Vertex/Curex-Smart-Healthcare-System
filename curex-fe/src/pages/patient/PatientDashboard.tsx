import { useEffect, useMemo, useState } from 'react'
import { WelcomeBanner } from '../../components/patient/WelcomeBanner'
import { MedicalDetailsCard } from '../../components/patient/MedicalDetailsCard'
import { QuickActions } from '../../components/patient/QuickActions'
import { ConsultationHistoryRow } from '../../components/patient/ConsultationHistoryRow'
import { getAppointmentsByPatient, type AppointmentRecord } from '../../services/appointmentService'
import { getPatientByUserId, getPrescriptions } from '../../services/patientService'
import { useAuth } from '../../store/hooks'
import { useMyProfile } from '../../hooks/useMyProfile'
import type {
  ConsultationRecord,
  MedicalDetailsSnapshot,
} from '../../types/patient'

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

function toDisplayDate(appointmentTime: string): string {
  const d = new Date(appointmentTime)
  if (Number.isNaN(d.getTime())) return 'Unknown date'
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function deriveHealthStatus(
  appt: AppointmentRecord,
  prescriptionIssued: boolean
): ConsultationRecord['healthStatus'] {
  if (appt.status === 'COMPLETED' && prescriptionIssued) {
    return 'GOOD'
  }
  return 'FAIR'
}

export function PatientDashboard() {
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useMyProfile()
  const [sortOrder, setSortOrder] = useState<SortOrder>('new-to-old')
  const [consultations, setConsultations] = useState<ConsultationRecord[]>([])
  const [consultationsLoading, setConsultationsLoading] = useState(true)

  const patientName = user?.firstName ?? 'there'

  const medicalDetails: MedicalDetailsSnapshot = useMemo(() => ({
    age: computeAge(profile?.dob),
    bloodGroup: profile?.bloodGroup ?? null,
    gender: formatGender(profile?.gender),
    allergies: parseCsvField(profile?.allergies),
    chronicConditions: parseCsvField(profile?.chronicConditions),
  }), [profile?.dob, profile?.bloodGroup, profile?.gender, profile?.allergies, profile?.chronicConditions])

  useEffect(() => {
    let active = true

    async function loadConsultations() {
      if (!user?.id || user.role !== 'PATIENT') {
        if (active) {
          setConsultations([])
          setConsultationsLoading(false)
        }
        return
      }

      try {
        setConsultationsLoading(true)
        const [appointments, patient] = await Promise.all([
          getAppointmentsByPatient(user.id),
          getPatientByUserId(user.id, user),
        ])

        const prescriptions = await getPrescriptions(patient.id)
        const prescriptionAppointmentIds = new Set(
          prescriptions
            .map((rx) => rx.appointmentId)
            .filter((id): id is string => Boolean(id))
        )

        const now = Date.now()
        const historyRows = appointments
          .filter((appt) => {
            if (appt.status === 'CANCELLED') {
              return false
            }
            const when = new Date(appt.appointmentTime).getTime()
            return appt.status === 'COMPLETED' || (!Number.isNaN(when) && when <= now)
          })
          .sort(
            (a, b) =>
              new Date(b.appointmentTime).getTime() -
              new Date(a.appointmentTime).getTime()
          )
          .map((appt) => {
            const prescriptionIssued = prescriptionAppointmentIds.has(appt.id)
            const visitType = appt.doctorSpecialty?.trim()
              ? appt.doctorSpecialty
              : appt.type === 'TELEMEDICINE'
                ? 'Telemedicine'
                : 'In-person consultation'

            return {
              id: appt.id,
              doctorId: appt.doctorId,
              doctorName: appt.doctorName?.trim() || 'Doctor',
              doctorSpecialty: appt.doctorSpecialty,
              date: toDisplayDate(appt.appointmentTime),
              visitType,
              healthStatus: deriveHealthStatus(appt, prescriptionIssued),
              prescriptionIssued,
              appointmentId: appt.id,
            } satisfies ConsultationRecord
          })

        if (active) {
          setConsultations(historyRows)
        }
      } catch {
        if (active) {
          setConsultations([])
        }
      } finally {
        if (active) {
          setConsultationsLoading(false)
        }
      }
    }

    loadConsultations()
    return () => {
      active = false
    }
  }, [user])

  const sortedConsultations = useMemo(() => {
    const sorted = [...consultations]
    if (sortOrder === 'old-to-new') {
      sorted.reverse()
    }
    return sorted
  }, [consultations, sortOrder])

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
          {consultationsLoading ? (
            <div className="patient-empty-state">
              <p className="text-text-secondary">Loading consultation history...</p>
            </div>
          ) : sortedConsultations.length > 0 ? (
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
