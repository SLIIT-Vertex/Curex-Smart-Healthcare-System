import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Plus,
  Search,
  X,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  User,
  Pill,
  ClipboardList,
  Stethoscope,
  AlertCircle,
  ChevronRight,
  Filter,
  Video,
  MapPin,
} from 'lucide-react'
import { PrescriptionForm } from '../../components/doctor/PrescriptionForm'
import type { Prescription, PrescriptionStatus } from '../../types/doctor'
import type { PrescriptionFormData } from '../../components/doctor/PrescriptionForm'
import { getDoctorByUserId } from '../../services/doctorService'
import { getApiErrorMessage } from '../../services/axiosInstance'
import {
  getPrescriptionsByDoctor,
  issuePrescription,
} from '../../services/prescriptionService'
import { getAppointmentsByDoctor } from '../../services/appointmentService'
import type { AppointmentRecord } from '../../types/appointment'
import { useAuth } from '../../store/hooks'
import { useToast } from '../../store/hooks'
import '../../styles/pages/DoctorPrescriptions.css'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatAppointmentDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Visit row: date and time for appointment context (no raw IDs). */
function formatVisitDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function appointmentTypeLabel(type: 'IN_PERSON' | 'TELEMEDICINE'): string {
  return type === 'IN_PERSON' ? 'In person' : 'Telemedicine'
}

function appointmentStatusLabel(status: AppointmentRecord['status']): string {
  const labels: Record<AppointmentRecord['status'], string> = {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    IN_SESSION: 'In session',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  }
  return labels[status]
}

function relativeDate(iso: string): string {
  const now = new Date()
  const d = new Date(iso)
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff} days ago`
  return formatDate(iso)
}

function StatusBadge({ status }: { status?: PrescriptionStatus }) {
  const s = status ?? 'PENDING'
  const icons: Record<string, typeof CheckCircle2> = {
    ACTIVE: CheckCircle2,
    ISSUED: CheckCircle2,
    COMPLETED: CheckCircle2,
    PENDING: Clock,
    CANCELLED: XCircle,
  }
  const Icon = icons[s] ?? CheckCircle2
  return (
    <span className={`rx-badge rx-badge--${s}`}>
      <Icon className="h-3 w-3" strokeWidth={2} />
      {s}
    </span>
  )
}

function parseMedicines(raw: string): string[] {
  return raw
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
}

const INPUT_CLASS =
  'rounded-xl border border-text-secondary/20 bg-surface px-4 py-2.5 text-sm text-primary placeholder:text-text-secondary focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20 transition-colors'

const DATE_INPUT_CLASS = `${INPUT_CLASS} !px-3 !py-2 min-w-[9.25rem] max-w-[10.5rem] shrink-0`

const STATUS_FILTER_OPTIONS: { value: PrescriptionStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ISSUED', label: 'Issued' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

/** API maps in-window prescriptions to ACTIVE; treat ISSUED filter as “currently valid”. */
function matchesPrescriptionStatusFilter(
  rx: Prescription,
  filter: PrescriptionStatus | ''
): boolean {
  if (!filter) return true
  const s = rx.status ?? 'PENDING'
  if (filter === 'ISSUED') return s === 'ISSUED' || s === 'ACTIVE'
  return s === filter
}

export function DoctorPrescriptions() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [patientFilter, setPatientFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState<PrescriptionStatus | ''>('')
  const [selectedPrescription, setSelectedPrescription] =
    useState<Prescription | null>(null)
  const [prefill, setPrefill] = useState<{ patientId: string; appointmentId: string } | undefined>(undefined)

  const patientNames = useMemo(() => {
    const map: Record<string, string> = {}
    prescriptions.forEach((rx) => {
      if (rx.patientName) map[rx.patientId] = rx.patientName
    })
    appointments.forEach((a) => {
      if (a.patientName && !map[a.patientId]) map[a.patientId] = a.patientName
    })
    return map
  }, [prescriptions, appointments])

  const appointmentById = useMemo(() => {
    const map: Record<string, AppointmentRecord> = {}
    appointments.forEach((a) => {
      map[a.id] = a
    })
    return map
  }, [appointments])

  const eligibleAppointments = useMemo(() => {
    return appointments.filter(
      (a) => a.status === 'IN_SESSION' || a.status === 'COMPLETED'
    )
  }, [appointments])

  const prescribedAppointmentIds = useMemo(
    () => new Set(prescriptions.map((rx) => rx.appointmentId).filter(Boolean)),
    [prescriptions]
  )

  const appointmentsWithoutPrescription = useMemo(
    () =>
      eligibleAppointments.filter((a) => !prescribedAppointmentIds.has(a.id)),
    [eligibleAppointments, prescribedAppointmentIds]
  )

  const formAppointments = useMemo(
    () =>
      appointmentsWithoutPrescription.map((a) => ({
        id: a.id,
        patientId: a.patientId,
        patientName: a.patientName,
        patientEmail: a.patientEmail,
        date: formatAppointmentDate(a.appointmentTime),
      })),
    [appointmentsWithoutPrescription]
  )

  const formPatients = useMemo(() => {
    const seen = new Set<string>()
    return appointmentsWithoutPrescription
      .filter((a) => {
        if (seen.has(a.patientId)) return false
        seen.add(a.patientId)
        return true
      })
      .map((a) => ({
        id: a.patientId,
        name: a.patientName ?? a.patientId,
      }))
  }, [appointmentsWithoutPrescription])

  const pendingFromAppointments: Prescription[] = useMemo(
    () =>
      appointmentsWithoutPrescription.map((a) => ({
        id: `pending-appt-${a.id}`,
        doctorId: doctorId ?? '',
        patientId: a.patientId,
        patientName: a.patientName,
        appointmentId: a.id,
        medicines: '',
        issuedAt: a.appointmentTime,
        status: 'PENDING' as PrescriptionStatus,
      })),
    [appointmentsWithoutPrescription, doctorId]
  )

  const noIssueReason = useMemo(() => {
    if (loading) return null
    if (appointments.length === 0) {
      return 'You have no appointments yet. Prescriptions can only be issued after you have visits with patients.'
    }
    if (eligibleAppointments.length === 0) {
      return 'None of your appointments are in session or completed yet. Start or finish a visit before issuing a prescription.'
    }
    if (appointmentsWithoutPrescription.length === 0) {
      return 'Every in-session or completed visit already has a prescription linked.'
    }
    return null
  }, [
    loading,
    appointments.length,
    eligibleAppointments.length,
    appointmentsWithoutPrescription.length,
  ])

  const openIssueModal = useCallback(() => {
    if (appointmentsWithoutPrescription.length === 0) {
      const msg =
        noIssueReason ??
        'No eligible appointments. Prescriptions require an appointment that is in session or completed, without an existing prescription for that visit.'
      toast(msg, 'info')
      return
    }
    setModalOpen(true)
  }, [appointmentsWithoutPrescription.length, noIssueReason, toast])

  const fetchDoctorAndData = useCallback(async () => {
    if (!user?.id || user.role !== 'DOCTOR') return
    setLoading(true)
    setError(null)
    try {
      const doctor = await getDoctorByUserId(user.id, user)
      setDoctorId(doctor.id)
      const [rxList, apptList] = await Promise.all([
        getPrescriptionsByDoctor(doctor.id),
        getAppointmentsByDoctor(doctor.id),
      ])
      setPrescriptions(rxList as Prescription[])
      setAppointments(apptList)
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'Failed to load prescriptions')
      setError(msg)
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  useEffect(() => {
    fetchDoctorAndData()
  }, [fetchDoctorAndData])

  const allPrescriptions = useMemo(
    () => [...pendingFromAppointments, ...prescriptions],
    [pendingFromAppointments, prescriptions]
  )

  const filtered = useMemo(() => {
    return allPrescriptions.filter((rx) => {
      if (patientFilter) {
        const name = patientNames[rx.patientId] ?? ''
        if (
          !name.toLowerCase().includes(patientFilter.toLowerCase()) &&
          !rx.patientId.toLowerCase().includes(patientFilter.toLowerCase())
        ) {
          return false
        }
      }
      if (dateFrom && rx.issuedAt < dateFrom) return false
      if (dateTo && rx.issuedAt > `${dateTo}T23:59:59`) return false
      if (statusFilter && !matchesPrescriptionStatusFilter(rx, statusFilter)) return false
      return true
    })
  }, [allPrescriptions, patientFilter, dateFrom, dateTo, statusFilter, patientNames])

  const activeFilterCount = [patientFilter, dateFrom, dateTo, statusFilter].filter(
    Boolean
  ).length

  const clearFilters = () => {
    setPatientFilter('')
    setDateFrom('')
    setDateTo('')
    setStatusFilter('')
  }

  const handleIssuePrescription = async (data: PrescriptionFormData) => {
    if (!doctorId) {
      toast('Doctor profile not loaded', 'error')
      return
    }
    const medicinesStr = data.medicines
      .map(
        (m) =>
          `${m.name}${m.dosage ? ` ${m.dosage}` : ''}${m.frequency ? `, ${m.frequency}` : ''}${m.duration ? `, ${m.duration}` : ''}`
      )
      .join('; ')

    try {
      await issuePrescription({
        doctorId,
        patientId: data.patientId,
        appointmentId: data.appointmentId,
        patientEmail: data.patientEmail,
        patientName: data.patientName,
        diagnosis: data.diagnosis,
        medicines: medicinesStr,
        instructions: data.instructions || undefined,
        validFrom: data.validFrom,
        validTo: data.validTo,
      })
      toast('Prescription issued successfully', 'success')
      setModalOpen(false)
      window.dispatchEvent(new CustomEvent('curex:notification-preferences-changed'))
      await fetchDoctorAndData()
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'Failed to issue prescription')
      toast(msg, 'error')
    }
  }

  const isPendingPlaceholder = (rx: Prescription) =>
    rx.id.startsWith('pending-appt-')

  const handleCardClick = (rx: Prescription) => {
    if (isPendingPlaceholder(rx)) {
      setPrefill({ patientId: rx.patientId, appointmentId: rx.appointmentId! })
      setModalOpen(true)
    } else {
      setSelectedPrescription(rx)
    }
  }

  const displayName = (rx: Prescription) =>
    rx.patientName ?? patientNames[rx.patientId] ?? rx.patientId

  const visitContext = (rx: Prescription) => {
    const appt = rx.appointmentId ? appointmentById[rx.appointmentId] : undefined
    const whenIso = appt?.appointmentTime ?? rx.issuedAt
    return {
      whenLabel: formatVisitDateTime(whenIso),
      relativeLabel: relativeDate(whenIso),
      typeLabel: appt ? appointmentTypeLabel(appt.type) : null,
      visitStatus: appt ? appointmentStatusLabel(appt.status) : null,
    }
  }

  if (loading && !doctorId) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-primary-light/20 border-t-primary-light" />
        <p className="text-sm text-text-secondary">Loading prescriptions...</p>
      </div>
    )
  }

  if (user?.role !== 'DOCTOR') {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl bg-surface p-8" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-error/10">
          <AlertCircle className="h-7 w-7 text-error" strokeWidth={1.5} />
        </div>
        <p className="text-center text-text-secondary">
          You must be logged in as a doctor to view prescriptions.
        </p>
      </div>
    )
  }

  if (error && !doctorId) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-error/20 bg-surface p-8" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-error/10">
          <AlertCircle className="h-7 w-7 text-error" strokeWidth={1.5} />
        </div>
        <p className="text-center font-medium text-primary">{error}</p>
        <p className="text-center text-sm text-text-secondary">
          Ensure you have created a doctor profile. Prescriptions require a doctor
          profile linked to your account.
        </p>
      </div>
    )
  }

  return (
    <div className="rx-page flex min-h-0 flex-1 flex-col gap-6">
      <div className="shrink-0 space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="rx-fade-in flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-light/10">
              <ClipboardList className="h-5.5 w-5.5 text-primary-light" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
                Prescriptions
              </h1>
              <p className="mt-0.5 text-sm text-text-secondary">
                Manage and track all patient prescriptions
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={openIssueModal}
          className="group btn-primary gap-2 shadow-md shadow-primary-light/20 hover:shadow-lg hover:shadow-primary-light/30 transition-all"
          title={
            appointmentsWithoutPrescription.length === 0
              ? 'Tap for details on why issuing is unavailable'
              : undefined
          }
        >
          <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" strokeWidth={2} />
          New Prescription
        </button>
      </div>

      {/* ── Info banner ─────────────────────────────────────────── */}
      {noIssueReason && (
        <div
          className="rx-fade-in flex items-start gap-3 rounded-2xl border border-accent-peach/30 bg-accent-peach/5 px-4 py-3.5"
          role="status"
          style={{ animationDelay: '0.05s' }}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" strokeWidth={1.5} />
          <p className="text-sm text-text-secondary">{noIssueReason}</p>
        </div>
      )}

      {/* ── Search & filters (single row; horizontal scroll on narrow viewports) ── */}
      <div className="rx-filter-bar rx-fade-in" style={{ animationDelay: '0.15s' }}>
        <div className="rx-filter-row flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch] sm:gap-3">
          <div className="relative min-w-[10rem] w-[min(100%,18rem)] shrink-0 sm:min-w-[12rem] sm:w-auto sm:max-w-md sm:flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" strokeWidth={1.5} />
            <input
              type="text"
              value={patientFilter}
              onChange={(e) => setPatientFilter(e.target.value)}
              placeholder="Search patient…"
              className={`w-full pl-10 ${INPUT_CLASS} !py-2`}
              aria-label="Search by patient name or ID"
            />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <label
              htmlFor="rx-prescriptions-date-from"
              className="whitespace-nowrap text-[11px] font-medium uppercase tracking-wider text-text-secondary"
            >
              From
            </label>
            <input
              id="rx-prescriptions-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={DATE_INPUT_CLASS}
            />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <label
              htmlFor="rx-prescriptions-date-to"
              className="whitespace-nowrap text-[11px] font-medium uppercase tracking-wider text-text-secondary"
            >
              To
            </label>
            <input
              id="rx-prescriptions-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={DATE_INPUT_CLASS}
            />
          </div>

          <div className="flex shrink-0 items-center gap-1.5 border-l border-text-secondary/15 pl-2 sm:pl-3">
            <label
              htmlFor="rx-prescriptions-status"
              className="whitespace-nowrap text-[11px] font-medium uppercase tracking-wider text-text-secondary"
            >
              Status
            </label>
            <select
              id="rx-prescriptions-status"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter((e.target.value || '') as PrescriptionStatus | '')
              }
              className={`min-w-[9.5rem] max-w-[11rem] shrink-0 cursor-pointer ${INPUT_CLASS} !py-2`}
              aria-label="Filter by prescription status"
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="shrink-0 whitespace-nowrap text-xs font-medium text-primary-light hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* ── Results summary ─────────────────────────────────────── */}
      {!loading && (
        <div className="rx-fade-in flex items-center gap-2 text-sm text-text-secondary" style={{ animationDelay: '0.2s' }}>
          <Filter className="h-3.5 w-3.5" strokeWidth={1.5} />
          Showing <span className="font-semibold text-primary">{filtered.length}</span> of{' '}
          <span className="font-semibold text-primary">{allPrescriptions.length}</span> prescriptions
        </div>
      )}
      </div>

      {/* ── Prescription list: fills width; only this region scrolls ── */}
      <div
        className="rx-prescription-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-1"
        role="region"
        aria-label="Prescription list"
      >
      {filtered.length > 0 ? (
        <ul className="rx-prescription-list w-full min-w-0 max-w-none list-none space-y-3 p-0">
          {filtered.map((rx, idx) => {
            const medicines = parseMedicines(rx.medicines)
            const status = rx.status ?? 'PENDING'
            const visit = visitContext(rx)
            const appt = rx.appointmentId ? appointmentById[rx.appointmentId] : undefined
            const visitWhenIso = appt?.appointmentTime ?? rx.issuedAt
            return (
              <li key={rx.id} className="rx-fade-in w-full min-w-0" style={{ animationDelay: `${0.05 * Math.min(idx, 12)}s` }}>
                <div
                  className={`rx-card rx-card--list rx-card--${status} group`}
                  onClick={() => handleCardClick(rx)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleCardClick(rx)}
                >
                  <div className="rx-card-list-inner">
                    <div className="rx-card-list-main min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-light/8">
                            <User className="h-4 w-4 text-primary-light" strokeWidth={1.5} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-primary">
                              {displayName(rx)}
                            </p>
                            <p className="mt-0.5 text-xs text-text-secondary">
                              <span className="font-medium text-text-secondary/90">Visit</span>
                              <span className="mx-1.5 text-text-secondary/40" aria-hidden>
                                ·
                              </span>
                              <time dateTime={visitWhenIso}>
                                {visit.whenLabel}
                              </time>
                              <span className="text-text-secondary/50"> ({visit.relativeLabel})</span>
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={rx.status} />
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                        {visit.typeLabel && (
                          <span className="inline-flex items-center gap-1.5">
                            {appt?.type === 'TELEMEDICINE' ? (
                              <Video className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={1.5} />
                            ) : (
                              <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={1.5} />
                            )}
                            {visit.typeLabel}
                          </span>
                        )}
                        {visit.visitStatus && isPendingPlaceholder(rx) && (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-accent-peach/12 px-2 py-0.5 font-medium text-amber-800/90">
                            <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
                            {visit.visitStatus}
                          </span>
                        )}
                      </div>

                      {isPendingPlaceholder(rx) ? (
                        <p className="mt-3 text-sm text-text-secondary">
                          No prescription issued for this visit yet. Click to add medicines and issue.
                        </p>
                      ) : (
                        <>
                          {rx.diagnosis && (
                            <div className="mt-3 flex items-start gap-2 border-t border-text-secondary/10 pt-3">
                              <Stethoscope className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-light/80" strokeWidth={1.5} />
                              <p className="line-clamp-2 text-sm text-primary/90">{rx.diagnosis}</p>
                            </div>
                          )}

                          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-text-secondary/10 pt-3">
                            {medicines.length === 0 ? (
                              <span className="text-xs italic text-text-secondary">No medicines listed</span>
                            ) : (
                              <>
                                {medicines.slice(0, 4).map((med, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 rounded-lg bg-background/80 px-2 py-1 text-[11px] font-medium text-text-secondary"
                                  >
                                    <Pill className="h-3 w-3" strokeWidth={1.5} />
                                    {med.length > 36 ? `${med.slice(0, 36)}…` : med}
                                  </span>
                                ))}
                                {medicines.length > 4 && (
                                  <span className="inline-flex items-center rounded-lg bg-primary-light/8 px-2 py-1 text-[11px] font-semibold text-primary-light">
                                    +{medicines.length - 4} more
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </>
                      )}

                      <div className="mt-3 flex items-center justify-end border-t border-text-secondary/5 pt-2 text-xs font-medium text-primary-light opacity-70 transition-opacity group-hover:opacity-100">
                        <span className="flex items-center gap-1">
                          {isPendingPlaceholder(rx) ? 'Issue prescription' : 'View details'}
                          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="rx-empty rx-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="rx-empty-icon">
            <ClipboardList className="h-8 w-8" strokeWidth={1.5} />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-primary">
            {loading ? 'Loading prescriptions...' : 'No prescriptions found'}
          </h3>
          <p className="mt-1.5 max-w-sm text-sm text-text-secondary">
            {loading
              ? 'Please wait while we fetch your prescription data.'
              : activeFilterCount > 0
                ? 'Try adjusting your filters or search terms to find what you\'re looking for.'
                : 'Issue your first prescription using the button above to get started.'}
          </p>
          {activeFilterCount > 0 && !loading && (
            <button
              type="button"
              onClick={clearFilters}
              className="btn-secondary mt-4 text-sm"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
      </div>

      {/* ── Issue modal ─────────────────────────────────────────── */}
      <PrescriptionForm
        key={
          prefill
            ? `prefill-${prefill.appointmentId}`
            : 'issue-prescription-blank'
        }
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setPrefill(undefined)
        }}
        onSubmit={handleIssuePrescription}
        patients={formPatients}
        appointments={formAppointments}
        prefill={prefill}
      />

      {/* ── Detail modal ────────────────────────────────────────── */}
      {selectedPrescription && (
        <div
          className="rx-backdrop-enter fixed inset-0 z-50 flex items-center justify-center bg-primary/20 p-4 backdrop-blur-sm"
          onClick={(e) =>
            e.target === e.currentTarget && setSelectedPrescription(null)
          }
        >
          <div
            className="rx-modal-enter relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-surface"
            style={{ boxShadow: '0 24px 80px rgb(28 39 76 / 0.15)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-text-secondary/10 bg-surface/95 px-6 py-4 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light/10">
                  <FileText className="h-5 w-5 text-primary-light" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-primary">
                    Prescription Details
                  </h2>
                  <p className="text-xs text-text-secondary">
                    ID: {selectedPrescription.id.slice(0, 12)}...
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPrescription(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-primary-light/10 hover:text-primary"
                aria-label="Close"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Modal body */}
            <div className="space-y-5 p-6">
              {/* Patient & Status */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light/8">
                    <User className="h-6 w-6 text-primary-light" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-semibold text-primary">
                      {displayName(selectedPrescription)}
                    </p>
                    <p className="text-xs text-text-secondary">Patient</p>
                  </div>
                </div>
                <StatusBadge status={selectedPrescription.status} />
              </div>

              {/* Details grid */}
              <div className="rx-detail-section">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="rx-detail-label">Issued</p>
                    <p className="rx-detail-value">
                      {formatDate(selectedPrescription.issuedAt)}
                    </p>
                  </div>
                  <div>
                    <p className="rx-detail-label">Valid from</p>
                    <p className="rx-detail-value">
                      {selectedPrescription.validFrom
                        ? formatDate(selectedPrescription.validFrom)
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="rx-detail-label">Valid to</p>
                    <p className="rx-detail-value">
                      {selectedPrescription.validTo
                        ? formatDate(selectedPrescription.validTo)
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Diagnosis */}
              {selectedPrescription.diagnosis && (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-primary-light" strokeWidth={1.5} />
                    <h3 className="text-sm font-semibold text-primary">Diagnosis</h3>
                  </div>
                  <div className="rx-detail-section">
                    <p className="text-sm leading-relaxed text-primary whitespace-pre-wrap">
                      {selectedPrescription.diagnosis}
                    </p>
                  </div>
                </div>
              )}

              {/* Medicines */}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Pill className="h-4 w-4 text-primary-light" strokeWidth={1.5} />
                  <h3 className="text-sm font-semibold text-primary">Medicines</h3>
                </div>
                <div className="space-y-2">
                  {parseMedicines(selectedPrescription.medicines).map(
                    (med, i) => (
                      <div key={i} className="rx-medicine-row">
                        <div className="rx-medicine-pill">{i + 1}</div>
                        <p className="text-sm text-primary">{med}</p>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Instructions */}
              {selectedPrescription.instructions && (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary-light" strokeWidth={1.5} />
                    <h3 className="text-sm font-semibold text-primary">
                      Instructions
                    </h3>
                  </div>
                  <div className="rx-detail-section">
                    <p className="text-sm leading-relaxed text-primary whitespace-pre-wrap">
                      {selectedPrescription.instructions}
                    </p>
                  </div>
                </div>
              )}

              {/* Linked visit (human-readable; no appointment ID) */}
              {selectedPrescription.appointmentId &&
                appointmentById[selectedPrescription.appointmentId] && (
                  <div className="rx-detail-section">
                    <p className="rx-detail-label">Visit</p>
                    <p className="mt-1 text-sm font-medium text-primary">
                      {formatVisitDateTime(
                        appointmentById[selectedPrescription.appointmentId].appointmentTime
                      )}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {appointmentTypeLabel(
                        appointmentById[selectedPrescription.appointmentId].type
                      )}
                      <span className="mx-1.5 text-text-secondary/40">·</span>
                      {appointmentStatusLabel(
                        appointmentById[selectedPrescription.appointmentId].status
                      )}
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
