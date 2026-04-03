import { useState, useMemo, useEffect, useCallback, Fragment } from 'react'
import {
  Plus,
  Search,
  X,
  FileText,
  User,
  Pill,
  ClipboardList,
  Stethoscope,
  AlertCircle,
  Filter,
  Video,
  MapPin,
  ChevronDown,
  ChevronUp,
  CalendarClock,
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

function parseDisplayDate(iso: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(iso)
}

function formatDateShort(iso: string): string {
  return parseDisplayDate(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

function formatIssuedDetail(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return formatDate(iso)
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

function parseMedicines(raw: string): string[] {
  return raw
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Days before validTo to highlight as “expiring soon” (same as patient view). */
const EXPIRING_SOON_DAYS = 14

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

interface MedicineTableRow {
  name: string
  dosage: string
  frequency: string
  duration: string
}

function looksLikeDuration(s: string): boolean {
  const t = s.trim().toLowerCase()
  if (!t) return false
  if (/(?:^|\s)(?:days?|weeks?|months?|years?)\b/.test(t)) return true
  if (/^\d[\d\s]*(?:-|–)?\s*\d*\s*(?:days?|weeks?|months?)?$/i.test(t)) return true
  return /\d/.test(t) && /\b(for\s+)?\d+\b/.test(t)
}

function parseMedicineLineSerialized(line: string): MedicineTableRow {
  const t = line.trim()
  if (!t) return { name: '', dosage: '', frequency: '', duration: '' }

  const parts = t.split(', ').map((p) => p.trim())
  let nameHead = ''
  let frequency = ''
  let duration = ''

  if (parts.length === 1) {
    return { name: parts[0]!, dosage: '', frequency: '', duration: '' }
  }

  if (parts.length === 2) {
    nameHead = parts[0]!
    const second = parts[1]!
    if (looksLikeDuration(second)) duration = second
    else frequency = second
  } else {
    duration = parts[parts.length - 1]!
    frequency = parts[parts.length - 2]!
    nameHead = parts.slice(0, -2).join(', ')
  }

  const sp = nameHead.indexOf(' ')
  if (sp === -1) {
    return { name: nameHead, dosage: '', frequency, duration }
  }
  return {
    name: nameHead.slice(0, sp),
    dosage: nameHead.slice(sp + 1).trim(),
    frequency,
    duration,
  }
}

function parseMedicinesForTable(raw: string): MedicineTableRow[] {
  return parseMedicines(raw).map(parseMedicineLineSerialized)
}

const STATUS_STYLES: Record<PrescriptionStatus, string> = {
  PENDING:
    'border border-accent-peach/45 border-l-[3px] border-l-accent-peach bg-accent-peach/25 text-primary',
  ACTIVE:
    'border border-accent-mint/45 border-l-[3px] border-l-accent-mint bg-accent-mint/25 text-primary',
  ISSUED:
    'border border-primary-light/50 border-l-[3px] border-l-primary-light bg-primary-light/22 text-primary',
  COMPLETED:
    'border border-accent-sky/45 border-l-[3px] border-l-accent-sky bg-accent-sky/25 text-primary',
  CANCELLED:
    'border border-error/45 border-l-[3px] border-l-error bg-error/22 text-primary',
}

const STATUS_SECTION_BG: Record<PrescriptionStatus, string> = {
  PENDING: 'bg-accent-peach/[0.14]',
  ACTIVE: 'bg-accent-mint/[0.14]',
  ISSUED: 'bg-primary-light/[0.12]',
  COMPLETED: 'bg-accent-sky/[0.14]',
  CANCELLED: 'bg-error/[0.10]',
}

const STATUS_DETAIL_BORDER: Record<PrescriptionStatus, string> = {
  PENDING: 'border-accent-peach/35',
  ACTIVE: 'border-accent-mint/35',
  ISSUED: 'border-primary-light/40',
  COMPLETED: 'border-accent-sky/35',
  CANCELLED: 'border-error/35',
}

const STATUS_LABELS: Record<PrescriptionStatus, string> = {
  PENDING: 'Pending',
  ACTIVE: 'Active',
  ISSUED: 'Issued',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

function normalizeRxStatus(status?: PrescriptionStatus): PrescriptionStatus {
  const s = status ?? 'PENDING'
  if (
    s === 'PENDING' ||
    s === 'ACTIVE' ||
    s === 'ISSUED' ||
    s === 'COMPLETED' ||
    s === 'CANCELLED'
  ) {
    return s
  }
  return 'PENDING'
}

function StatusBadge({ status }: { status?: PrescriptionStatus }) {
  const s = normalizeRxStatus(status)
  const label = STATUS_LABELS[s] ?? s
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[s] ?? STATUS_STYLES.PENDING}`}
    >
      {label}
    </span>
  )
}

type ValidityKind = 'ok' | 'soon' | 'ended' | 'future' | 'neutral'

function getValidityKind(rx: Prescription, today: Date): ValidityKind {
  const t = startOfLocalDay(today)
  const from = rx.validFrom ? startOfLocalDay(parseDisplayDate(rx.validFrom)) : null
  const to = rx.validTo ? startOfLocalDay(parseDisplayDate(rx.validTo)) : null

  if (!from && !to) return 'neutral'
  if (from && t < from) return 'future'
  if (to && t > to) return 'ended'
  if (to) {
    const msLeft = to.getTime() - t.getTime()
    const daysLeft = msLeft / (24 * 60 * 60 * 1000)
    if (daysLeft >= 0 && daysLeft <= EXPIRING_SOON_DAYS) return 'soon'
  }
  return 'ok'
}

function PendingNa({ className = '' }: { className?: string }) {
  return (
    <span
      className={`text-sm font-medium tabular-nums text-text-secondary ${className}`.trim()}
    >
      N/A
    </span>
  )
}

const LINKED_VISIT_TH =
  'w-[5.25rem] shrink-0 py-0.5 pr-2 align-top font-normal text-text-secondary'

/** Linked visit block oriented for the doctor: patient + visit logistics. */
function DoctorLinkedVisitSection({
  appointment,
  patientLabel,
}: {
  appointment: AppointmentRecord
  patientLabel: string
}) {
  const leftRows: [string, string][] = [
    ['Patient', patientLabel],
    ['Date & time', formatVisitDateTime(appointment.appointmentTime)],
  ]
  const rightRows: [string, string][] = [
    ['Visit type', appointmentTypeLabel(appointment.type)],
    ['Visit status', appointmentStatusLabel(appointment.status)],
  ]

  return (
    <div className="rounded-lg border border-primary-light/20 bg-primary-light/[0.06] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
        Linked visit
      </p>
      <div className="mt-1.5 flex flex-row items-start gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <table className="w-full border-collapse text-left text-xs">
            <tbody>
              {leftRows.map(([label, val]) => (
                <tr key={label}>
                  <th scope="row" className={LINKED_VISIT_TH}>
                    {label}
                  </th>
                  <td className="py-0.5 font-medium leading-snug text-primary">{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <span
          className="shrink-0 select-none self-stretch pt-0.5 text-sm font-light leading-none text-text-secondary/30"
          aria-hidden
        >
          |
        </span>
        <div className="min-w-0 flex-1">
          <table className="w-full border-collapse text-left text-xs">
            <tbody>
              {rightRows.map(([label, val]) => (
                <tr key={label}>
                  <th scope="row" className={LINKED_VISIT_TH}>
                    {label}
                  </th>
                  <td className="py-0.5 font-medium leading-snug text-primary">{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function cellOrDash(val: string) {
  const t = val.trim()
  return t ? t : '—'
}

function MedicinesDetailTable({ raw }: { raw: string }) {
  const rows = parseMedicinesForTable(raw)
  if (rows.length === 0) {
    return <p className="text-xs text-text-secondary">No medicines listed.</p>
  }
  return (
    <div className="overflow-x-auto rounded-md border border-text-secondary/12">
      <table className="w-full min-w-[36rem] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-text-secondary/12 bg-background/70">
            <th className="w-7 px-1.5 py-1.5 font-semibold text-text-secondary">#</th>
            <th className="min-w-[6.5rem] px-1.5 py-1.5 font-semibold text-text-secondary">
              Medicine name
            </th>
            <th className="min-w-[5rem] px-1.5 py-1.5 font-semibold text-text-secondary">Dosage</th>
            <th className="min-w-[5.5rem] px-1.5 py-1.5 font-semibold text-text-secondary">
              Frequency
            </th>
            <th className="min-w-[5rem] px-1.5 py-1.5 font-semibold text-text-secondary">Duration</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-text-secondary/8 last:border-b-0">
              <td className="px-1.5 py-1.5 align-top tabular-nums text-text-secondary">{i + 1}</td>
              <td className="px-1.5 py-1.5 align-top leading-snug text-primary">
                {cellOrDash(row.name)}
              </td>
              <td className="px-1.5 py-1.5 align-top leading-snug text-primary">
                {cellOrDash(row.dosage)}
              </td>
              <td className="px-1.5 py-1.5 align-top leading-snug text-primary">
                {cellOrDash(row.frequency)}
              </td>
              <td className="px-1.5 py-1.5 align-top leading-snug text-primary">
                {cellOrDash(row.duration)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ValidityPill({ rx }: { rx: Prescription }) {
  const today = new Date()
  const kind = getValidityKind(rx, today)
  const cls = {
    ok: 'rx-validity-pill rx-validity-pill--ok',
    soon: 'rx-validity-pill rx-validity-pill--soon',
    ended: 'rx-validity-pill rx-validity-pill--ended',
    future: 'rx-validity-pill rx-validity-pill--future',
    neutral: 'rx-validity-pill rx-validity-pill--neutral',
  }[kind]

  let label = '—'
  if (rx.validFrom && rx.validTo) {
    label = `${formatDateShort(rx.validFrom)} – ${formatDateShort(rx.validTo)}`
  } else if (rx.validTo) {
    label = `Until ${formatDateShort(rx.validTo)}`
  } else if (rx.validFrom) {
    label = `From ${formatDateShort(rx.validFrom)}`
  }

  const hint =
    kind === 'ended'
      ? 'Period ended'
      : kind === 'soon'
        ? `≤ ${EXPIRING_SOON_DAYS} days left`
        : kind === 'future'
          ? 'Not yet valid'
          : kind === 'neutral'
            ? 'No dates on file'
            : null

  return (
    <span className="inline-flex max-w-full flex-col gap-0.5" title={hint ?? label}>
      <span className={`${cls} max-w-full`}>
        <CalendarClock className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={1.5} />
        <span className="truncate">{label}</span>
      </span>
      {hint && (
        <span className="text-[10px] font-medium text-text-secondary">{hint}</span>
      )}
    </span>
  )
}

function truncateStr(str: string, maxLen: number): string {
  if (!str) return ''
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen) + '…'
}

const TABLE_COL_COUNT = 9

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

/** ISSUED = prescribed but not yet in validity window; ACTIVE = currently valid. */
function matchesPrescriptionStatusFilter(
  rx: Prescription,
  filter: PrescriptionStatus | ''
): boolean {
  if (!filter) return true
  const s = rx.status ?? 'PENDING'
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
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
        appointmentTime: a.appointmentTime,
        type: a.type,
        status: a.status,
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

  const filteredSorted = useMemo(() => {
    const list = allPrescriptions.filter((rx) => {
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
    return [...list].sort(
      (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
    )
  }, [allPrescriptions, patientFilter, dateFrom, dateTo, statusFilter, patientNames])

  const emptyBecauseFilters =
    allPrescriptions.length > 0 && filteredSorted.length === 0

  const activeFilterCount = [patientFilter, dateFrom, dateTo, statusFilter].filter(
    Boolean
  ).length

  const clearFilters = () => {
    setPatientFilter('')
    setDateFrom('')
    setDateTo('')
    setStatusFilter('')
  }

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
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
          Showing <span className="font-semibold text-primary">{filteredSorted.length}</span> of{' '}
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
      <div className="rx-table-shell overflow-hidden">
        <div className="overflow-x-auto">
          <table className="rx-table w-full">
            <thead>
              <tr className="border-b border-text-secondary/20 bg-background/50">
                <th
                  className="w-10 px-4 py-3 text-left text-xs font-medium text-text-secondary"
                  aria-label="Expand"
                />
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">
                  Issued
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">
                  Patient
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium text-text-secondary sm:table-cell">
                  Visit
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">
                  Medicines & diagnosis
                </th>
                <th className="hidden min-w-[7.5rem] px-4 py-3 text-left text-xs font-medium text-text-secondary md:table-cell">
                  Validity
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium text-text-secondary lg:table-cell">
                  Instructions
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSorted.length > 0 ? (
                filteredSorted.map((rx) => {
                  const isExpanded = expandedId === rx.id
                  const awaitingRx = isPendingPlaceholder(rx)
                  const statusKey = normalizeRxStatus(rx.status)
                  const sectionBg = STATUS_SECTION_BG[statusKey]
                  const detailBorder = STATUS_DETAIL_BORDER[statusKey]
                  const appt = rx.appointmentId ? appointmentById[rx.appointmentId] : undefined
                  const visitWhenIso = appt?.appointmentTime ?? rx.issuedAt
                  const patientLabel = displayName(rx)
                  return (
                    <Fragment key={rx.id}>
                      <tr className={`border-b border-text-secondary/10 ${sectionBg}`}>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => toggleExpand(rx.id)}
                            className="flex items-center justify-center rounded-lg p-1 text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light/25"
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" strokeWidth={1.5} />
                            ) : (
                              <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary">
                          {awaitingRx ? (
                            <PendingNa />
                          ) : (
                            <span className="tabular-nums">{formatDateShort(rx.issuedAt)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-primary">
                          {patientLabel}
                        </td>
                        <td className="hidden px-4 py-3 text-sm text-text-secondary sm:table-cell">
                          <div className="flex flex-col gap-0.5">
                            <span className="tabular-nums text-primary/90">
                              {formatDateShort(visitWhenIso)}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                              {appt?.type === 'TELEMEDICINE' ? (
                                <Video className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={1.5} />
                              ) : appt ? (
                                <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={1.5} />
                              ) : null}
                              {appt ? appointmentTypeLabel(appt.type) : '—'}
                            </span>
                          </div>
                        </td>
                        <td className="max-w-[12rem] px-4 py-3 text-sm sm:max-w-[16rem]">
                          {awaitingRx ? (
                            <p className="text-text-secondary">
                              <span className="font-medium text-primary/90">Awaiting prescription</span>
                              <span className="mt-0.5 block text-xs text-text-secondary/90">
                                Issue medicines for this visit
                              </span>
                            </p>
                          ) : (
                            <>
                              <p className="truncate text-text-secondary">
                                {truncateStr(rx.medicines, 42)}
                              </p>
                              {rx.diagnosis && (
                                <p
                                  className="mt-1 line-clamp-2 text-xs leading-snug text-text-secondary/90"
                                  title={rx.diagnosis}
                                >
                                  <span className="font-medium text-primary/80">Dx: </span>
                                  {truncateStr(rx.diagnosis, 90)}
                                </p>
                              )}
                            </>
                          )}
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          {awaitingRx ? <PendingNa /> : <ValidityPill rx={rx} />}
                        </td>
                        <td className="hidden max-w-[11rem] px-4 py-3 text-sm text-text-secondary lg:table-cell">
                          {awaitingRx ? (
                            <PendingNa />
                          ) : rx.instructions?.trim() ? (
                            <p
                              className="line-clamp-4 break-words leading-snug text-primary"
                              title={rx.instructions}
                            >
                              {rx.instructions}
                            </p>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={rx.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleCardClick(rx)}
                            className="text-sm font-medium text-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light/25 focus-visible:ring-offset-2"
                          >
                            {awaitingRx ? 'Issue' : 'Details'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className={`border-b border-text-secondary/10 ${sectionBg}`}>
                          <td colSpan={TABLE_COL_COUNT} className="px-3 py-3">
                            <div
                              className={`rounded-lg border bg-surface/90 px-3 py-2.5 ${detailBorder}`}
                            >
                              <div className="space-y-2.5">
                                {rx.appointmentId ? (
                                  appointmentById[rx.appointmentId] ? (
                                    <DoctorLinkedVisitSection
                                      appointment={appointmentById[rx.appointmentId]}
                                      patientLabel={patientLabel}
                                    />
                                  ) : (
                                    <div className="rounded-lg border border-text-secondary/12 bg-background/40 px-3 py-2">
                                      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                                        Linked visit
                                      </p>
                                      <p className="mt-1 text-xs leading-snug text-text-secondary">
                                        Visit details could not be loaded. Try refreshing the page.
                                      </p>
                                    </div>
                                  )
                                ) : null}

                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                                    Prescription details
                                  </p>
                                  {awaitingRx ? (
                                    <div
                                      className={`mt-2 rounded-md border bg-accent-peach/15 px-2.5 py-2 ${detailBorder}`}
                                    >
                                      <p className="text-xs leading-snug text-primary">
                                        No prescription has been issued for this visit yet. Use{' '}
                                        <span className="font-semibold">Issue</span> to add medicines
                                        and send the script to the patient.
                                      </p>
                                      <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-text-secondary">
                                        <span>Status</span>
                                        <StatusBadge status={rx.status} />
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="mt-2 space-y-2.5">
                                      <div className="grid gap-3 sm:grid-cols-2 sm:items-start sm:gap-x-8">
                                        <div className="min-w-0">
                                          <table className="w-full border-collapse text-left text-xs">
                                            <tbody>
                                              <tr>
                                                <th
                                                  scope="row"
                                                  className="w-[5.5rem] shrink-0 py-0.5 pr-2 align-top font-normal text-text-secondary"
                                                >
                                                  Rx ID
                                                </th>
                                                <td className="break-all py-0.5 font-mono text-[11px] leading-snug text-primary">
                                                  {rx.id}
                                                </td>
                                              </tr>
                                              <tr>
                                                <th
                                                  scope="row"
                                                  className="py-0.5 pr-2 align-top font-normal text-text-secondary"
                                                >
                                                  Issued
                                                </th>
                                                <td className="py-0.5 font-medium leading-snug text-primary">
                                                  {formatIssuedDetail(rx.issuedAt)}
                                                </td>
                                              </tr>
                                              <tr>
                                                <th
                                                  scope="row"
                                                  className="py-0.5 pr-2 align-top font-normal text-text-secondary"
                                                >
                                                  Status
                                                </th>
                                                <td className="py-0.5">
                                                  <StatusBadge status={rx.status} />
                                                </td>
                                              </tr>
                                              {rx.diagnosis ? (
                                                <tr>
                                                  <th
                                                    scope="row"
                                                    className="py-0.5 pr-2 align-top font-normal text-text-secondary"
                                                  >
                                                    Diagnosis
                                                  </th>
                                                  <td className="py-0.5 leading-snug text-primary">
                                                    <p className="whitespace-pre-wrap">{rx.diagnosis}</p>
                                                  </td>
                                                </tr>
                                              ) : null}
                                            </tbody>
                                          </table>
                                        </div>
                                        <div className="min-w-0">
                                          <table className="w-full border-collapse text-left text-xs">
                                            <tbody>
                                              <tr>
                                                <th
                                                  scope="row"
                                                  className="w-[5.5rem] shrink-0 py-0.5 pr-2 align-top font-normal text-text-secondary"
                                                >
                                                  Patient
                                                </th>
                                                <td className="py-0.5 font-medium leading-snug text-primary">
                                                  {patientLabel}
                                                </td>
                                              </tr>
                                              <tr>
                                                <th
                                                  scope="row"
                                                  className="py-0.5 pr-2 align-top font-normal text-text-secondary"
                                                >
                                                  Valid period
                                                </th>
                                                <td className="py-0.5">
                                                  <ValidityPill rx={rx} />
                                                  {(rx.validFrom || rx.validTo) && (
                                                    <p className="mt-1 text-[11px] leading-snug text-text-secondary">
                                                      {rx.validFrom && rx.validTo
                                                        ? `${formatDate(rx.validFrom)} – ${formatDate(rx.validTo)}`
                                                        : rx.validFrom
                                                          ? `From ${formatDate(rx.validFrom)}`
                                                          : rx.validTo
                                                            ? `Until ${formatDate(rx.validTo)}`
                                                            : null}
                                                    </p>
                                                  )}
                                                </td>
                                              </tr>
                                              <tr>
                                                <th
                                                  scope="row"
                                                  className="py-0.5 pr-2 align-top font-normal text-text-secondary"
                                                >
                                                  Visit
                                                </th>
                                                <td className="py-0.5 leading-snug text-primary">
                                                  {appt
                                                    ? `${formatVisitDateTime(appt.appointmentTime)} · ${appointmentTypeLabel(appt.type)}`
                                                    : '—'}
                                                </td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>

                                      {rx.instructions ? (
                                        <div className="rounded-md border border-text-secondary/10 bg-background/45 px-2.5 py-2">
                                          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                                            Instructions
                                          </p>
                                          <p
                                            className="mt-1 line-clamp-4 break-words text-xs leading-relaxed text-primary"
                                            title={rx.instructions}
                                          >
                                            {rx.instructions}
                                          </p>
                                        </div>
                                      ) : null}

                                      <div>
                                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                                          Medicines
                                        </p>
                                        <MedicinesDetailTable raw={rx.medicines} />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={TABLE_COL_COUNT} className="p-0">
                    <div className="rx-table-empty">
                      <p className="text-text-secondary">
                        {loading
                          ? 'Loading prescriptions…'
                          : emptyBecauseFilters
                            ? 'No prescriptions match your filters. Try adjusting status or date range.'
                            : allPrescriptions.length === 0
                              ? 'Issue your first prescription using the button above, or complete a visit that still needs a script.'
                              : 'No prescriptions found.'}
                      </p>
                      {emptyBecauseFilters && !loading && (
                        <button
                          type="button"
                          className="mt-4 text-sm font-medium text-primary-light hover:underline"
                          onClick={clearFilters}
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
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
          className="rx-backdrop-enter fixed inset-0 z-[140] flex items-center justify-center bg-primary/20 p-4 backdrop-blur-sm"
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
