import {
  useState,
  useRef,
  useEffect,
  useMemo,
  type ComponentType,
  type ReactNode,
} from 'react'
import { X, Plus, Trash2, User, CalendarClock } from 'lucide-react'
import type { MedicineLine } from '../../types/doctor'
import type { AppointmentStatus } from '../../types/appointment'
import type { PatientProfile } from '../../types/patient'
import { getPatientClinicalProfileForAppointment } from '../../services/patientService'
import { visitPhaseWhenIssuedDescription } from '../../lib/visitPhaseWhenIssued'

const INPUT_CLASS =
  'w-full rounded-xl border border-text-secondary/20 bg-surface px-4 py-2.5 text-sm text-primary placeholder:text-text-secondary focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20'

export interface PrescriptionFormData {
  patientId: string
  appointmentId: string
  patientEmail?: string
  patientName?: string
  diagnosis?: string
  medicines: MedicineLine[]
  instructions: string
  validFrom: string
  validTo: string
}

export interface PrescriptionFormAppointment {
  id: string
  patientId: string
  patientName?: string
  patientEmail?: string
  /** Short label for the dropdown (e.g. date only) */
  date: string
  appointmentTime: string
  type: 'IN_PERSON' | 'TELEMEDICINE'
  status: AppointmentStatus
}

export interface PrescriptionFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: PrescriptionFormData) => void
  patients: { id: string; name: string }[]
  appointments: PrescriptionFormAppointment[]
  prefill?: { patientId: string; appointmentId: string }
}

const emptyMedicine: MedicineLine = {
  name: '',
  dosage: '',
  frequency: '',
  duration: '',
}

function ageFromDateOfBirth(iso?: string): string | null {
  if (!iso?.trim()) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  const m = today.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1
  if (age < 0 || age > 130) return null
  return String(age)
}

function formatVisitDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function visitTypeLabel(type: 'IN_PERSON' | 'TELEMEDICINE'): string {
  return type === 'IN_PERSON' ? 'In person' : 'Telemedicine'
}

function visitStatusLabel(status: AppointmentStatus): string {
  const labels: Record<AppointmentStatus, string> = {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    IN_SESSION: 'In session',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  }
  return labels[status]
}

function formatList(items: string[] | undefined, emptyLabel: string): string {
  if (!items?.length) return emptyLabel
  return items.join(', ')
}

function DetailBlock({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
        {label}
      </dt>
      <dd className="text-sm font-medium leading-snug text-primary">{value}</dd>
    </div>
  )
}

function PanelCard({
  icon: Icon,
  title,
  children,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  children: ReactNode
}) {
  return (
    <section
      className="rounded-2xl border border-text-secondary/12 bg-surface p-4 shadow-sm"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="mb-3 flex items-center gap-2 border-b border-text-secondary/10 pb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-light/10 text-primary-light">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </div>
        <h3 className="text-sm font-semibold text-primary">{title}</h3>
      </div>
      {children}
    </section>
  )
}

/** YYYY-MM-DD in the user's local calendar (avoids UTC shifting vs doctor-service status-zone dates). */
function localYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/

function addDaysToYmd(ymd: string, days: number): string {
  if (!YMD_RE.test(ymd)) return ymd
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(y!, m! - 1, d!)
  dt.setDate(dt.getDate() + days)
  return localYmd(dt)
}

function defaultValidFromString(): string {
  return localYmd(new Date())
}

function defaultValidToString(): string {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return localYmd(d)
}

export function PrescriptionForm({
  isOpen,
  onClose,
  onSubmit,
  patients,
  appointments,
  prefill,
}: PrescriptionFormProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const [patientId, setPatientId] = useState(prefill?.patientId ?? '')
  const [appointmentId, setAppointmentId] = useState(prefill?.appointmentId ?? '')
  const [medicines, setMedicines] = useState<MedicineLine[]>([{ ...emptyMedicine }])
  const [instructions, setInstructions] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [validFrom, setValidFrom] = useState(defaultValidFromString)
  const [validTo, setValidTo] = useState(defaultValidToString)
  const [validityDateError, setValidityDateError] = useState<string | null>(null)
  const [patientSearch, setPatientSearch] = useState('')
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null)
  /** Appointment / form `patientId` is the auth user id; profile `id` is different. */
  const [profileResolvedForPatientId, setProfileResolvedForPatientId] = useState<
    string | null
  >(null)

  const filteredPatients = patientSearch
    ? patients.filter(
        (p) =>
          p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
          p.id.toLowerCase().includes(patientSearch.toLowerCase())
      )
    : patients

  const filteredAppointments = appointments.filter(
    (a) => !patientId || a.patientId === patientId
  )

  const selectedAppointment = useMemo(
    () => appointments.find((a) => a.id === appointmentId),
    [appointments, appointmentId]
  )

  const issueVisitSnapshot =
    selectedAppointment &&
    (selectedAppointment.status === 'IN_SESSION' ||
      selectedAppointment.status === 'COMPLETED')
      ? visitPhaseWhenIssuedDescription(selectedAppointment.status)
      : null

  useEffect(() => {
    if (!patientId) return
    let cancelled = false
    getPatientClinicalProfileForAppointment(patientId)
      .then((profile) => {
        if (!cancelled) {
          setPatientProfile(profile)
          setProfileResolvedForPatientId(patientId)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPatientProfile({
            id: patientId,
            name: '',
            email: '',
            createdAt: '',
          })
          setProfileResolvedForPatientId(patientId)
        }
      })
    return () => {
      cancelled = true
    }
  }, [patientId])

  const displayedPatientProfile =
    patientId && profileResolvedForPatientId === patientId ? patientProfile : null
  const patientProfileLoading = Boolean(
    patientId && profileResolvedForPatientId !== patientId
  )

  const handleAppointmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    setAppointmentId(id)
    if (id) {
      const appt = appointments.find((a) => a.id === id)
      if (appt) {
        setPatientId(appt.patientId)
      }
    }
  }

  const reset = () => {
    setPatientId('')
    setAppointmentId('')
    setMedicines([{ ...emptyMedicine }])
    setInstructions('')
    setDiagnosis('')
    setValidFrom(defaultValidFromString())
    setValidTo(defaultValidToString())
    setValidityDateError(null)
    setPatientSearch('')
    setPatientProfile(null)
    setProfileResolvedForPatientId(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validMedicines = medicines.filter((m) => m.name.trim())
    const selectedAppt = appointments.find((a) => a.id === appointmentId)
    const resolvedPatientId = patientId || selectedAppt?.patientId
    if (!resolvedPatientId || !appointmentId || validMedicines.length === 0) return

    const todayYmd = localYmd(new Date())
    if (!YMD_RE.test(validFrom) || !YMD_RE.test(validTo)) {
      setValidityDateError('Please enter valid from and valid to dates.')
      return
    }
    if (validFrom < todayYmd) {
      setValidityDateError('Valid from cannot be before today.')
      return
    }
    if (validTo <= validFrom) {
      setValidityDateError('Valid to must be after valid from.')
      return
    }
    setValidityDateError(null)

    const emailFromAppt = selectedAppt?.patientEmail?.trim()
    const emailFromProfile = displayedPatientProfile?.email?.trim()
    const resolvedPatientEmail =
      emailFromAppt && emailFromAppt.length > 0
        ? emailFromAppt
        : emailFromProfile && emailFromProfile.length > 0
          ? emailFromProfile
          : undefined

    onSubmit({
      patientId: resolvedPatientId,
      appointmentId,
      patientEmail: resolvedPatientEmail,
      patientName: selectedAppt?.patientName,
      diagnosis: diagnosis.trim() || undefined,
      medicines: validMedicines,
      instructions,
      validFrom,
      validTo,
    })
    handleClose()
  }

  const addMedicine = () => {
    setMedicines((prev) => [...prev, { ...emptyMedicine }])
  }

  const updateMedicine = (index: number, field: keyof MedicineLine, value: string) => {
    setMedicines((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const removeMedicine = (index: number) => {
    setMedicines((prev) => prev.filter((_, i) => i !== index))
  }

  useEffect(() => {
    if (!isOpen) return
    const id = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(id)
  }, [isOpen])

  const patientAge = displayedPatientProfile
    ? ageFromDateOfBirth(displayedPatientProfile.dateOfBirth)
    : null
  const bloodDisplay = displayedPatientProfile?.bloodType?.trim() || null
  const allergiesDisplay = displayedPatientProfile
    ? formatList(displayedPatientProfile.medicalHistory?.allergies, 'None on file')
    : null
  const chronicDisplay = displayedPatientProfile
    ? formatList(
        displayedPatientProfile.medicalHistory?.conditions,
        'None on file'
      )
    : null

  const todayYmd = localYmd(new Date())
  const validToMinYmd =
    YMD_RE.test(validFrom) && validFrom >= todayYmd
      ? addDaysToYmd(validFrom, 1)
      : addDaysToYmd(todayYmd, 1)
  const dateFieldErrorClass = validityDateError
    ? ' border-error/50 focus:border-error focus:ring-error/20'
    : ''

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-primary/25 p-3 backdrop-blur-sm sm:p-5"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="prescription-form-title"
        className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-surface shadow-2xl ring-1 ring-primary/8"
        style={{ boxShadow: '0 24px 80px rgb(28 39 76 / 0.18)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-text-secondary/10 bg-surface px-5 py-4 sm:px-7 sm:py-5">
          <h2
            id="prescription-form-title"
            className="text-lg font-semibold tracking-tight text-primary sm:text-xl"
          >
            Issue Prescription
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary transition hover:bg-primary-light/10 hover:text-primary"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Left: patient + visit context */}
          <aside className="flex max-h-[40vh] shrink-0 flex-col gap-4 overflow-y-auto border-b border-text-secondary/10 bg-background/50 p-4 sm:p-5 lg:max-h-none lg:w-[min(100%,20rem)] lg:border-b-0 lg:border-r xl:w-[22rem]">
            <PanelCard icon={User} title="Patient details">
              {!patientId ? (
                <p className="text-sm text-text-secondary">
                  Choose a patient to load age, blood group, known allergies, and
                  chronic conditions.
                </p>
              ) : patientProfileLoading ? (
                <p className="text-sm text-text-secondary">Loading patient details…</p>
              ) : (
                <dl className="space-y-3">
                  <DetailBlock
                    label="Age"
                    value={
                      patientAge != null
                        ? `${patientAge} years`
                        : patientProfile?.dateOfBirth
                          ? '—'
                          : 'Not on file'
                    }
                  />
                  <DetailBlock
                    label="Blood group"
                    value={bloodDisplay ?? 'Not on file'}
                  />
                  <DetailBlock label="Known allergies" value={allergiesDisplay ?? '—'} />
                  <DetailBlock
                    label="Chronic conditions"
                    value={chronicDisplay ?? '—'}
                  />
                </dl>
              )}
            </PanelCard>

            <PanelCard icon={CalendarClock} title="Appointment details">
              {!appointmentId || !selectedAppointment ? (
                <p className="text-sm text-text-secondary">
                  Choose an appointment to see date &amp; time, visit type, and
                  status.
                </p>
              ) : (
                <dl className="space-y-3">
                  <DetailBlock
                    label="Date & time"
                    value={formatVisitDateTime(selectedAppointment.appointmentTime)}
                  />
                  <DetailBlock
                    label="Visit type"
                    value={visitTypeLabel(selectedAppointment.type)}
                  />
                  <DetailBlock
                    label="Visit status"
                    value={visitStatusLabel(selectedAppointment.status)}
                  />
                </dl>
              )}
            </PanelCard>
          </aside>

          {/* Right: form */}
          <form
            onSubmit={handleSubmit}
            className="min-h-0 min-w-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6 lg:p-7"
          >
            <div>
              <label className="block text-sm font-medium text-primary">
                Patient
              </label>
              <div className="mt-1.5 flex flex-nowrap items-stretch gap-2 sm:gap-3">
                <input
                  type="search"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Search by name or ID…"
                  className={`min-w-0 flex-1 basis-0 ${INPUT_CLASS}`}
                  aria-label="Search patient by name or ID"
                />
                <select
                  value={patientId}
                  onChange={(e) => {
                    const next = e.target.value
                    setPatientId(next)
                    setAppointmentId('')
                    if (!next) {
                      setPatientProfile(null)
                      setProfileResolvedForPatientId(null)
                    }
                  }}
                  required
                  className={`min-w-0 flex-1 basis-0 ${INPUT_CLASS}`}
                  aria-label="Select a patient"
                >
                  <option value="">Select a patient</option>
                  {filteredPatients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary">
                Appointment (required)
              </label>
              <select
                value={appointmentId}
                onChange={handleAppointmentChange}
                required
                className={`mt-1.5 ${INPUT_CLASS}`}
              >
                <option value="">Select an appointment</option>
                {filteredAppointments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.patientName ?? a.patientId} — {a.date}
                  </option>
                ))}
              </select>
            </div>

            {issueVisitSnapshot ? (
              <div
                className="rounded-2xl border border-primary-light/35 bg-gradient-to-br from-primary-light/[0.14] via-surface to-primary-light/[0.06] px-4 py-4 shadow-sm ring-1 ring-primary-light/12"
                role="status"
                aria-live="polite"
              >
                <div className="flex gap-3 sm:gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-light/18 text-primary-light shadow-inner">
                    <CalendarClock className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-primary/90">
                      What we save on this prescription
                    </p>
                    <p className="text-base font-semibold leading-snug text-primary">
                      {issueVisitSnapshot.headline}
                    </p>
                    <p className="text-sm leading-relaxed text-text-secondary">
                      {issueVisitSnapshot.detail}
                    </p>
                    <p className="text-[11px] leading-relaxed text-text-secondary/90">
                      This matches the visit you selected — you do not need to enter it
                      manually. If the visit status changes later, this label stays as a
                      historical snapshot for you and your patient.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-primary">
                  Valid from
                </label>
                <input
                  type="date"
                  value={validFrom}
                  min={todayYmd}
                  onChange={(e) => {
                    const v = e.target.value
                    setValidityDateError(null)
                    setValidFrom(v)
                    if (YMD_RE.test(v)) {
                      setValidTo((prev) =>
                        prev && prev <= v ? addDaysToYmd(v, 1) : prev
                      )
                    }
                  }}
                  required
                  aria-invalid={Boolean(validityDateError)}
                  className={`mt-1.5 ${INPUT_CLASS}${dateFieldErrorClass}`}
                />
                <p className="mt-1 text-xs text-text-secondary">
                  Cannot be before today.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary">
                  Valid to
                </label>
                <input
                  type="date"
                  value={validTo}
                  min={validToMinYmd}
                  onChange={(e) => {
                    setValidityDateError(null)
                    setValidTo(e.target.value)
                  }}
                  required
                  aria-invalid={Boolean(validityDateError)}
                  className={`mt-1.5 ${INPUT_CLASS}${dateFieldErrorClass}`}
                />
                <p className="mt-1 text-xs text-text-secondary">
                  Must be after valid from.
                </p>
              </div>
            </div>
            {validityDateError ? (
              <p className="text-sm font-medium text-error" role="alert">
                {validityDateError}
              </p>
            ) : null}

            <div>
              <label className="block text-sm font-medium text-primary">
                Diagnosis / Clinical notes (optional)
              </label>
              <textarea
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                rows={2}
                placeholder="e.g. Viral upper respiratory tract infection"
                className={`mt-1.5 ${INPUT_CLASS} resize-y`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-primary">
                  Medicines
                </label>
                <button
                  type="button"
                  onClick={addMedicine}
                  className="flex items-center gap-1 text-sm font-medium text-primary-light hover:underline"
                >
                  <Plus className="h-4 w-4" strokeWidth={1.5} />
                  Add medicine
                </button>
              </div>

              <div className="mt-2 space-y-3">
                {medicines.map((m, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-text-secondary/15 bg-background/40 p-4"
                  >
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <input
                        type="text"
                        value={m.name}
                        onChange={(e) => updateMedicine(i, 'name', e.target.value)}
                        placeholder="Medicine name"
                        className={INPUT_CLASS}
                      />
                      <input
                        type="text"
                        value={m.dosage}
                        onChange={(e) => updateMedicine(i, 'dosage', e.target.value)}
                        placeholder="Dosage"
                        className={INPUT_CLASS}
                      />
                      <input
                        type="text"
                        value={m.frequency}
                        onChange={(e) =>
                          updateMedicine(i, 'frequency', e.target.value)
                        }
                        placeholder="Frequency"
                        className={INPUT_CLASS}
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={m.duration}
                          onChange={(e) =>
                            updateMedicine(i, 'duration', e.target.value)
                          }
                          placeholder="Duration"
                          className={INPUT_CLASS}
                        />
                        <button
                          type="button"
                          onClick={() => removeMedicine(i)}
                          disabled={medicines.length === 1}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-error/30 text-error transition hover:bg-error/10 disabled:opacity-40"
                          aria-label="Remove medicine"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary">
                Instructions
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={4}
                placeholder="Additional instructions for the patient..."
                className={`mt-1.5 ${INPUT_CLASS} resize-y`}
              />
            </div>

            <div className="flex flex-wrap gap-3 border-t border-text-secondary/10 pt-6">
              <button type="submit" className="btn-primary">
                Issue Prescription
              </button>
              <button type="button" onClick={handleClose} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
