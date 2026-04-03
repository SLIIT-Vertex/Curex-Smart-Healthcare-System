import { useState, useEffect, useMemo, Fragment, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search,
  ChevronDown,
  ChevronUp,
  PillBottle,
  CalendarClock,
} from 'lucide-react'
import { getPrescriptions, getPatientByUserId } from '../../services/patientService'
import { getAppointmentsByPatient } from '../../services/appointmentService'
import type { AppointmentRecord } from '../../types/appointment'
import type { PatientPrescription } from '../../types/patient'
import { useAuth } from '../../store/hooks'
import { useToast } from '../../store/hooks'
import '../../styles/pages/DoctorPrescriptions.css'

/** Use mock data when backend is unavailable (e.g. during development). */
const USE_MOCK_ON_ERROR = true

/** Days before validTo to highlight as “expiring soon”. */
const EXPIRING_SOON_DAYS = 14

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function parseDisplayDate(iso: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(iso)
}

function formatDate(iso: string): string {
  return parseDisplayDate(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
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

function formatVisitDateTime(iso: string): string {
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

function appointmentTypeLabel(type: AppointmentRecord['type']): string {
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

function truncate(str: string, maxLen: number): string {
  if (!str) return ''
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen) + '…'
}

/** Semicolon-separated medicine lines (same convention as doctor prescriptions). */
function parseMedicines(raw: string): string[] {
  return raw
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
}

interface MedicineTableRow {
  name: string
  dosage: string
  frequency: string
  duration: string
}

/** Heuristic: second comma-segment is duration vs frequency (matches `DoctorPrescriptions` issue shape). */
function looksLikeDuration(s: string): boolean {
  const t = s.trim().toLowerCase()
  if (!t) return false
  if (/(?:^|\s)(?:days?|weeks?|months?|years?)\b/.test(t)) return true
  if (/^\d[\d\s]*(?:-|–)?\s*\d*\s*(?:days?|weeks?|months?)?$/i.test(t)) return true
  return /\d/.test(t) && /\b(for\s+)?\d+\b/.test(t)
}

/**
 * Reverses the issue payload format:
 * `name[ dosage][, frequency][, duration]` per segment, joined with `; `
 * (see `DoctorPrescriptions` handleIssuePrescription).
 */
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

type RxStatus = 'PENDING' | 'ACTIVE' | 'ISSUED' | 'COMPLETED' | 'CANCELLED'

/** Status badge: distinct tint + left accent bar (no hover). */
const STATUS_STYLES: Record<RxStatus, string> = {
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

/** Full row / expanded section background per status. */
const STATUS_SECTION_BG: Record<RxStatus, string> = {
  PENDING: 'bg-accent-peach/[0.14]',
  ACTIVE: 'bg-accent-mint/[0.14]',
  ISSUED: 'bg-primary-light/[0.12]',
  COMPLETED: 'bg-accent-sky/[0.14]',
  CANCELLED: 'bg-error/[0.10]',
}

const STATUS_DETAIL_BORDER: Record<RxStatus, string> = {
  PENDING: 'border-accent-peach/35',
  ACTIVE: 'border-accent-mint/35',
  ISSUED: 'border-primary-light/40',
  COMPLETED: 'border-accent-sky/35',
  CANCELLED: 'border-error/35',
}

function normalizeRxStatus(status?: string): RxStatus {
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

const STATUS_LABELS: Record<RxStatus, string> = {
  PENDING: 'Pending',
  ACTIVE: 'Active',
  ISSUED: 'Issued',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

/** Synthetic rows for visits eligible for a script but none issued yet (mirrors doctor prescriptions UI). */
function isAwaitingPrescriptionPlaceholder(rx: PatientPrescription): boolean {
  return rx.id.startsWith('pending-appt-')
}

function buildAwaitingPrescriptionRows(
  appointments: AppointmentRecord[],
  issuedForAppointmentIds: Set<string>,
  patientUserId: string
): PatientPrescription[] {
  return appointments
    .filter(
      (a) =>
        (a.status === 'COMPLETED' || a.status === 'IN_SESSION') &&
        !issuedForAppointmentIds.has(a.id)
    )
    .map((a) => ({
      id: `pending-appt-${a.id}`,
      doctorId: a.doctorId,
      doctorName: a.doctorName,
      doctorSpecialty: a.doctorSpecialty,
      patientId: patientUserId,
      patientName: a.patientName,
      appointmentId: a.id,
      diagnosis: undefined,
      medicines:
        'No prescription has been issued for this visit yet. It will appear here once your doctor adds it.',
      instructions: undefined,
      validFrom: undefined,
      validTo: undefined,
      issuedAt: a.appointmentTime,
      status: 'PENDING' as const,
    }))
}

function StatusBadge({ status }: { status?: string }) {
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

/** ISSUED = prescribed but not yet valid; ACTIVE = within validity window. */
function matchesPatientRxStatusFilter(
  status: string | undefined,
  filter: RxStatus | ''
): boolean {
  if (!filter) return true
  const s = status ?? 'PENDING'
  return s === filter
}

function getValidityKind(rx: PatientPrescription, today: Date): ValidityKind {
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

/** Pending / placeholder cells (e.g. issued date not applicable). */
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

function LinkedVisitSection({ appointment }: { appointment: AppointmentRecord }) {
  const doctorCell =
    [appointment.doctorName, appointment.doctorSpecialty]
      .filter((s): s is string => Boolean(s?.trim()))
      .join(' · ') || '—'

  const leftRows: [string, string][] = [
    ['Doctor', doctorCell],
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
                  <td className="py-0.5 font-medium leading-snug text-primary">
                    {val}
                  </td>
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
                  <td className="py-0.5 font-medium leading-snug text-primary">
                    {val}
                  </td>
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
    return (
      <p className="text-xs text-text-secondary">No medicines listed.</p>
    )
  }
  return (
    <div className="overflow-x-auto rounded-md border border-text-secondary/12">
      <table className="w-full min-w-[36rem] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-text-secondary/12 bg-background/70">
            <th className="w-7 px-1.5 py-1.5 font-semibold text-text-secondary">
              #
            </th>
            <th className="min-w-[6.5rem] px-1.5 py-1.5 font-semibold text-text-secondary">
              Medicine name
            </th>
            <th className="min-w-[5rem] px-1.5 py-1.5 font-semibold text-text-secondary">
              Dosage
            </th>
            <th className="min-w-[5.5rem] px-1.5 py-1.5 font-semibold text-text-secondary">
              Frequency
            </th>
            <th className="min-w-[5rem] px-1.5 py-1.5 font-semibold text-text-secondary">
              Duration
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-text-secondary/8 last:border-b-0"
            >
              <td className="px-1.5 py-1.5 align-top tabular-nums text-text-secondary">
                {i + 1}
              </td>
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

function ValidityPill({ rx }: { rx: PatientPrescription }) {
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

const TABLE_COL_COUNT = 9

const INPUT_CLASS =
  'rounded-xl border border-text-secondary/20 bg-surface px-4 py-2.5 text-sm text-primary placeholder:text-text-secondary focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20 transition-colors'

const DATE_INPUT_CLASS = `${INPUT_CLASS} !px-3 !py-2 min-w-[9.25rem] max-w-[10.5rem] shrink-0`

const STATUS_FILTER_OPTIONS: { value: RxStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: STATUS_LABELS.PENDING },
  { value: 'ACTIVE', label: STATUS_LABELS.ACTIVE },
  { value: 'ISSUED', label: STATUS_LABELS.ISSUED },
  { value: 'COMPLETED', label: STATUS_LABELS.COMPLETED },
  { value: 'CANCELLED', label: STATUS_LABELS.CANCELLED },
]

export function PatientPrescriptions() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const appointmentFilter = searchParams.get('appointment')?.trim() ?? ''
  const [patientId, setPatientId] = useState<string | null>(null)
  const [prescriptions, setPrescriptions] = useState<PatientPrescription[]>([])
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [doctorFilter, setDoctorFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState<RxStatus | ''>('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchPrescriptions = useCallback(async () => {
    if (!user?.id || user.role !== 'PATIENT') return
    setLoading(true)
    setError(null)
    try {
      const patient = await getPatientByUserId(user.id, user)
      setPatientId(patient.id)
      let appointments: AppointmentRecord[] = []
      try {
        appointments = await getAppointmentsByPatient(user.id)
      } catch {
        appointments = []
      }
      const data = await getPrescriptions(patient.id)
      const issuedAppointmentIds = new Set(
        data
          .map((r) => r.appointmentId)
          .filter((id): id is string => Boolean(id))
      )
      const placeholders = buildAwaitingPrescriptionRows(
        appointments,
        issuedAppointmentIds,
        user.id
      )
      const merged = [...placeholders, ...data].sort(
        (a, b) =>
          new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
      )
      setAppointments(appointments)
      setPrescriptions(merged)
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to load prescriptions'
      setError(msg)
      if (USE_MOCK_ON_ERROR) {
        setAppointments([])
        setPrescriptions([])
        toast(msg, 'error')
      } else {
        throw err
      }
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  useEffect(() => {
    fetchPrescriptions()
  }, [fetchPrescriptions])

  useEffect(() => {
    if (!loading && prescriptions.length > 0) {
      window.dispatchEvent(new CustomEvent('curex:notification-preferences-changed'))
    }
  }, [loading, prescriptions.length])

  useEffect(() => {
    if (!appointmentFilter || prescriptions.length === 0) return
    const match = prescriptions.find(
      (rx) => rx.appointmentId === appointmentFilter
    )
    if (match) setExpandedId(match.id)
  }, [appointmentFilter, prescriptions])

  const clearVisitFilter = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('appointment')
      return next
    })
  }, [setSearchParams])

  const clearAllFilters = useCallback(() => {
    setStatusFilter('')
    setDoctorFilter('')
    setDateFrom('')
    setDateTo('')
    clearVisitFilter()
  }, [clearVisitFilter])

  const filteredSorted = useMemo(() => {
    const list = prescriptions.filter((rx) => {
      if (
        appointmentFilter &&
        rx.appointmentId !== appointmentFilter
      ) {
        return false
      }
      if (
        statusFilter &&
        !matchesPatientRxStatusFilter(rx.status, statusFilter)
      ) {
        return false
      }
      if (doctorFilter) {
        const name = (rx.doctorName ?? '').toLowerCase()
        const specialty = (rx.doctorSpecialty ?? '').toLowerCase()
        const q = doctorFilter.toLowerCase()
        if (!name.includes(q) && !specialty.includes(q)) return false
      }
      const issued = rx.issuedAt
      if (dateFrom && issued < dateFrom) return false
      if (dateTo && issued > `${dateTo}T23:59:59`) return false
      return true
    })
    return [...list].sort(
      (a, b) =>
        new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
    )
  }, [
    prescriptions,
    appointmentFilter,
    doctorFilter,
    dateFrom,
    dateTo,
    statusFilter,
  ])

  const activeFilterCount = [
    doctorFilter,
    dateFrom,
    dateTo,
    statusFilter,
  ].filter(Boolean).length

  const appointmentById = useMemo(() => {
    const map: Record<string, AppointmentRecord> = {}
    appointments.forEach((a) => {
      map[a.id] = a
    })
    return map
  }, [appointments])

  const appointmentFilterRecord = useMemo(
    () =>
      appointmentFilter ? appointmentById[appointmentFilter] : undefined,
    [appointmentFilter, appointmentById]
  )

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const emptyBecauseFilters =
    prescriptions.length > 0 && filteredSorted.length === 0

  if (loading && !patientId) {
    return (
      <div className="space-y-6">
        <div className="flex items-stretch gap-4">
          <div className="patient-loading-skeleton h-12 w-12 shrink-0 rounded-xl" />
          <div className="flex-1">
            <div className="patient-loading-skeleton h-8 w-40" />
            <div className="patient-loading-skeleton mt-2 h-4 w-64" />
          </div>
        </div>
        <div className="patient-card p-4">
          <div className="patient-loading-skeleton h-10 w-full" />
        </div>
        <div className="patient-card overflow-hidden">
          <div className="patient-loading-skeleton h-64 w-full" />
        </div>
      </div>
    )
  }

  if (user?.role !== 'PATIENT') {
    return (
      <div className="patient-card p-6">
        <p className="text-text-secondary">
          You must be logged in as a patient to view prescriptions.
        </p>
      </div>
    )
  }

  if (error && !patientId) {
    return (
      <div className="space-y-6">
        <div className="flex items-stretch gap-4">
          <span className="flex w-12 shrink-0 items-center justify-center rounded-xl bg-accent-sky/15 text-accent-sky">
            <PillBottle className="h-7 w-7" strokeWidth={1.5} />
          </span>
          <div>
            <h1 className="section-heading">Prescriptions</h1>
            <p className="section-subtext mt-1">
              View prescriptions issued by your doctors.
            </p>
          </div>
        </div>
        <div className="patient-card rounded-2xl border border-error/30 p-6">
          <p className="text-error">{error}</p>
          <p className="mt-2 text-sm text-text-secondary">
            Ensure you have created a patient profile. Prescriptions require a
            patient profile linked to your account.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rx-page flex min-h-0 min-w-0 flex-1 flex-col gap-6">
      <div className="shrink-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-between">
        <div className="flex items-stretch gap-4">
          <span className="flex w-12 shrink-0 items-center justify-center rounded-xl bg-accent-sky/15 text-accent-sky">
            <PillBottle className="h-7 w-7" strokeWidth={1.5} />
          </span>
          <div>
            <h1 className="section-heading">Prescriptions</h1>
            <p className="section-subtext mt-1 max-w-xl">
              See medicines, validity dates, and instructions from your care
              team.
            </p>
          </div>
        </div>
      </div>

      {appointmentFilter && (
        <div
          className="patient-card flex flex-col gap-3 border-primary-light/25 bg-primary-light/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <p className="text-sm text-primary">
            {appointmentFilterRecord ? (
              <>
                <span className="text-text-secondary">
                  Showing items for your visit on{' '}
                </span>
                <span className="font-medium text-primary">
                  {formatVisitDateTime(appointmentFilterRecord.appointmentTime)}
                </span>
                {appointmentFilterRecord.doctorName ? (
                  <>
                    <span className="text-text-secondary"> with </span>
                    <span className="font-medium text-primary">
                      {appointmentFilterRecord.doctorName}
                    </span>
                  </>
                ) : null}
                <span className="text-text-secondary">
                  {' '}
                  · {appointmentTypeLabel(appointmentFilterRecord.type)}
                </span>
              </>
            ) : (
              <span className="text-text-secondary">
                Showing items for a selected consultation. Visit details could
                not be loaded.
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={clearVisitFilter}
            className="shrink-0 text-left text-sm font-medium text-primary-light hover:underline sm:text-right"
          >
            Show all prescriptions
          </button>
        </div>
      )}

      {/* Search, date range & status — single row (scrolls horizontally on narrow viewports) */}
      <div className="rx-filter-bar rx-fade-in" style={{ animationDelay: '0.15s' }}>
        <div className="rx-filter-row flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch] sm:gap-3">
          <div className="relative min-w-[10rem] w-[min(100%,18rem)] shrink-0 sm:min-w-[12rem] sm:w-auto sm:max-w-md sm:flex-1">
            <Search
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
              strokeWidth={1.5}
            />
            <input
              type="text"
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              placeholder="Search doctor or specialty…"
              className={`w-full pl-10 ${INPUT_CLASS} !py-2`}
              aria-label="Search by doctor name or specialty"
            />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <label
              htmlFor="patient-rx-date-from"
              className="whitespace-nowrap text-[11px] font-medium uppercase tracking-wider text-text-secondary"
            >
              From
            </label>
            <input
              id="patient-rx-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={DATE_INPUT_CLASS}
              title="Issued on or after"
            />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <label
              htmlFor="patient-rx-date-to"
              className="whitespace-nowrap text-[11px] font-medium uppercase tracking-wider text-text-secondary"
            >
              To
            </label>
            <input
              id="patient-rx-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={DATE_INPUT_CLASS}
              title="Issued on or before"
            />
          </div>

          <div className="flex shrink-0 items-center gap-1.5 border-l border-text-secondary/15 pl-2 sm:pl-3">
            <label
              htmlFor="patient-rx-status"
              className="whitespace-nowrap text-[11px] font-medium uppercase tracking-wider text-text-secondary"
            >
              Status
            </label>
            <select
              id="patient-rx-status"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter((e.target.value || '') as RxStatus | '')
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
              onClick={clearAllFilters}
              className="shrink-0 whitespace-nowrap text-xs font-medium text-primary-light hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
      </div>
      </div>

      <div
        className="rx-prescription-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-1"
        role="region"
        aria-label="Prescription list"
      >
      <div className="patient-card overflow-hidden">
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
                  Doctor
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium text-text-secondary sm:table-cell">
                  Specialty
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
                  Print
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSorted.length > 0 ? (
                filteredSorted.map((rx) => {
                  const isExpanded = expandedId === rx.id
                  const awaitingRx = isAwaitingPrescriptionPlaceholder(rx)
                  const statusKey = normalizeRxStatus(rx.status)
                  const sectionBg = STATUS_SECTION_BG[statusKey]
                  const detailBorder = STATUS_DETAIL_BORDER[statusKey]
                  return (
                    <Fragment key={rx.id}>
                      <tr
                        className={`border-b border-text-secondary/10 ${sectionBg}`}
                      >
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
                              <ChevronDown
                                className="h-4 w-4"
                                strokeWidth={1.5}
                              />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary">
                          {awaitingRx ? (
                            <PendingNa />
                          ) : (
                            <span className="tabular-nums">
                              {formatDateShort(rx.issuedAt)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-primary">
                          {rx.doctorName ?? '—'}
                        </td>
                        <td className="hidden px-4 py-3 text-sm text-text-secondary sm:table-cell">
                          {rx.doctorSpecialty ?? '—'}
                        </td>
                        <td className="max-w-[12rem] px-4 py-3 text-sm sm:max-w-[16rem]">
                          {awaitingRx ? (
                            <p className="text-text-secondary">
                              <span className="font-medium text-primary/90">
                                Awaiting prescription
                              </span>
                              <span className="mt-0.5 block text-xs text-text-secondary/90">
                                Nothing issued for this visit yet
                              </span>
                            </p>
                          ) : (
                            <>
                              <p className="truncate text-text-secondary">
                                {truncate(rx.medicines, 42)}
                              </p>
                              {rx.diagnosis && (
                                <p
                                  className="mt-1 line-clamp-2 text-xs leading-snug text-text-secondary/90"
                                  title={rx.diagnosis}
                                >
                                  <span className="font-medium text-primary/80">
                                    Dx:{' '}
                                  </span>
                                  {truncate(rx.diagnosis, 90)}
                                </p>
                              )}
                            </>
                          )}
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          {awaitingRx ? (
                            <PendingNa />
                          ) : (
                            <ValidityPill rx={rx} />
                          )}
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
                            className="text-sm font-medium text-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light/25 focus-visible:ring-offset-2"
                            aria-label="Print prescription"
                          >
                            Print
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr
                          className={`border-b border-text-secondary/10 ${sectionBg}`}
                        >
                          <td colSpan={TABLE_COL_COUNT} className="px-3 py-3">
                            <div
                              className={`rounded-lg border bg-surface/90 px-3 py-2.5 ${detailBorder}`}
                            >
                              <div className="space-y-2.5">
                                {rx.appointmentId ? (
                                  appointmentById[rx.appointmentId] ? (
                                    <LinkedVisitSection
                                      appointment={appointmentById[rx.appointmentId]}
                                    />
                                  ) : (
                                    <div className="rounded-lg border border-text-secondary/12 bg-background/40 px-3 py-2">
                                      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                                        Linked visit
                                      </p>
                                      <p className="mt-1 text-xs leading-snug text-text-secondary">
                                        Details for this visit could not be loaded.
                                        Try refreshing the page.
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
                                        No prescription has been issued for this
                                        visit yet. It will appear here after your
                                        doctor adds it.
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
                                                  <StatusBadge
                                                    status={rx.status}
                                                  />
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
                                                    <p className="whitespace-pre-wrap">
                                                      {rx.diagnosis}
                                                    </p>
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
                                                  Doctor
                                                </th>
                                                <td className="py-0.5 leading-snug text-primary">
                                                  <span className="font-medium">
                                                    {rx.doctorName ?? '—'}
                                                  </span>
                                                  {rx.doctorSpecialty ? (
                                                    <span className="text-text-secondary">
                                                      {' '}
                                                      · {rx.doctorSpecialty}
                                                    </span>
                                                  ) : null}
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
                                                  {(rx.validFrom ||
                                                    rx.validTo) && (
                                                    <p className="mt-1 text-[11px] leading-snug text-text-secondary">
                                                      {rx.validFrom &&
                                                      rx.validTo
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
                                                  Patient
                                                </th>
                                                <td className="py-0.5 font-medium leading-snug text-primary">
                                                  {rx.patientName ?? '—'}
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
                    <div className="patient-empty-state">
                      <p className="text-text-secondary">
                        {loading
                          ? 'Loading prescriptions…'
                          : emptyBecauseFilters && appointmentFilter
                            ? 'No prescription is linked to this visit in your records yet. If you just had an appointment, it may take a short time to appear.'
                            : emptyBecauseFilters
                              ? 'No prescriptions match your filters. Try clearing status or date range.'
                              : prescriptions.length === 0
                                ? 'You have no prescriptions on file yet. They will appear here after a doctor issues one.'
                                : 'No prescriptions found.'}
                      </p>
                      {emptyBecauseFilters && (
                        <button
                          type="button"
                          className="mt-4 text-sm font-medium text-primary-light hover:underline"
                          onClick={clearAllFilters}
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
    </div>
  )
}
