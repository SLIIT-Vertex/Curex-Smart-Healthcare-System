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

function truncate(str: string, maxLen: number): string {
  if (!str) return ''
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen) + '…'
}

type RxStatus = 'PENDING' | 'ACTIVE' | 'ISSUED' | 'COMPLETED' | 'CANCELLED'

const STATUS_STYLES: Record<
  RxStatus,
  string
> = {
  PENDING: 'bg-accent-peach/20 text-primary border-accent-peach/40',
  ACTIVE: 'bg-accent-mint/20 text-primary border-accent-mint/40',
  ISSUED: 'bg-primary-light/20 text-primary border-primary-light/40',
  COMPLETED: 'bg-accent-sky/20 text-primary border-accent-sky/40',
  CANCELLED: 'bg-error/20 text-primary border-error/40',
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

function StatusBadge({ status }: { status?: RxStatus }) {
  const s = status ?? 'PENDING'
  const label = STATUS_LABELS[s] ?? s
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[s] ?? 'bg-background/50'}`}
    >
      {label}
    </span>
  )
}

type ValidityKind = 'ok' | 'soon' | 'ended' | 'future' | 'neutral'

/** Backend derives ACTIVE from validFrom–validTo; ISSUED filter matches in-window rx. */
function matchesPatientRxStatusFilter(
  status: string | undefined,
  filter: RxStatus
): boolean {
  const s = status ?? 'PENDING'
  if (filter === 'ISSUED') return s === 'ISSUED' || s === 'ACTIVE'
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

export function PatientPrescriptions() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const appointmentFilter = searchParams.get('appointment')?.trim() ?? ''
  const [patientId, setPatientId] = useState<string | null>(null)
  const [prescriptions, setPrescriptions] = useState<PatientPrescription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [doctorFilter, setDoctorFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | RxStatus>('ALL')
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
      setPrescriptions(merged)
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to load prescriptions'
      setError(msg)
      if (USE_MOCK_ON_ERROR) {
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
    setStatusFilter('ALL')
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
        statusFilter !== 'ALL' &&
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
    <div className="space-y-6">
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
            <span className="text-text-secondary">Filtered from your consultation: </span>
            appointment{' '}
            <span className="rounded bg-background/60 px-1.5 py-0.5 font-mono text-xs">
              {appointmentFilter}
            </span>
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

      {/* Status quick-filter + search / date range */}
      <div className="patient-card flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-medium text-text-secondary">
            Status
          </span>
          {(
            [
              ['ALL', 'All'],
              ['PENDING', STATUS_LABELS.PENDING],
              ['ACTIVE', STATUS_LABELS.ACTIVE],
              ['ISSUED', STATUS_LABELS.ISSUED],
              ['COMPLETED', STATUS_LABELS.COMPLETED],
              ['CANCELLED', STATUS_LABELS.CANCELLED],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`rx-filter-chip ${statusFilter === value ? 'rx-filter-chip--active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[12rem] flex-1">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
              strokeWidth={1.5}
            />
            <input
              type="text"
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              placeholder="Search doctor name or specialty…"
              className="patient-page-input w-full pl-10"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <label className="sr-only" htmlFor="rx-date-from">
              Issued from
            </label>
            <input
              id="rx-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="patient-page-input w-auto min-w-[10rem]"
              title="Issued on or after"
            />
            <label className="sr-only" htmlFor="rx-date-to">
              Issued until
            </label>
            <input
              id="rx-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="patient-page-input w-auto min-w-[10rem]"
              title="Issued on or before"
            />
          </div>
        </div>
      </div>

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
                  View
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSorted.length > 0 ? (
                filteredSorted.map((rx) => {
                  const isExpanded = expandedId === rx.id
                  return (
                    <Fragment key={rx.id}>
                      <tr className="border-b border-text-secondary/10 transition-colors hover:bg-background/50">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => toggleExpand(rx.id)}
                            className="flex items-center justify-center rounded-lg p-1 text-text-secondary transition-colors hover:bg-primary-light/10 hover:text-primary"
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
                          <span className="tabular-nums">
                            {formatDateShort(rx.issuedAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-primary">
                          {rx.doctorName ?? '—'}
                        </td>
                        <td className="hidden px-4 py-3 text-sm text-text-secondary sm:table-cell">
                          {rx.doctorSpecialty ?? '—'}
                        </td>
                        <td className="max-w-[12rem] px-4 py-3 text-sm sm:max-w-[16rem]">
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
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          <ValidityPill rx={rx} />
                        </td>
                        <td className="hidden max-w-[11rem] px-4 py-3 text-sm text-text-secondary lg:table-cell">
                          {truncate(rx.instructions ?? '', 40) || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={rx.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => toggleExpand(rx.id)}
                            className="text-sm font-medium text-primary-light hover:underline"
                          >
                            {isExpanded ? 'Hide' : 'View'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-b border-text-secondary/10 bg-background/30">
                          <td colSpan={TABLE_COL_COUNT} className="px-4 py-4">
                            <div className="rounded-xl border border-text-secondary/10 bg-surface/80 p-4">
                              <div className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                  <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                      Prescription ID
                                    </h4>
                                    <p className="mt-1 break-all text-sm font-mono text-primary">
                                      {isAwaitingPrescriptionPlaceholder(rx)
                                        ? '— (not issued yet)'
                                        : rx.id}
                                    </p>
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                      Issued
                                    </h4>
                                    <p className="mt-1 text-sm text-primary">
                                      {formatIssuedDetail(rx.issuedAt)}
                                    </p>
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                      Status
                                    </h4>
                                    <p className="mt-1">
                                      <StatusBadge status={rx.status} />
                                    </p>
                                  </div>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                  <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                      Prescribing doctor
                                    </h4>
                                    <p className="mt-1 text-sm font-medium text-primary">
                                      {rx.doctorName ?? '—'}
                                    </p>
                                    {rx.doctorSpecialty && (
                                      <p className="mt-0.5 text-xs text-text-secondary">
                                        {rx.doctorSpecialty}
                                      </p>
                                    )}
                                    <p className="mt-1 text-[11px] font-mono text-text-secondary">
                                      Doctor ID: {rx.doctorId}
                                    </p>
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                      Valid period
                                    </h4>
                                    <p className="mt-1">
                                      <ValidityPill rx={rx} />
                                    </p>
                                    {(rx.validFrom || rx.validTo) && (
                                      <p className="mt-2 text-xs text-text-secondary">
                                        {rx.validFrom && rx.validTo
                                          ? `${formatDate(rx.validFrom)} – ${formatDate(rx.validTo)}`
                                          : rx.validFrom
                                            ? `Valid from ${formatDate(rx.validFrom)}`
                                            : rx.validTo
                                              ? `Valid until ${formatDate(rx.validTo)}`
                                              : null}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {rx.patientName && (
                                  <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                      Patient on prescription
                                    </h4>
                                    <p className="mt-1 text-sm text-primary">
                                      {rx.patientName}
                                    </p>
                                  </div>
                                )}
                                {rx.diagnosis && (
                                  <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                      Diagnosis
                                    </h4>
                                    <p className="mt-1 text-sm leading-relaxed text-primary">
                                      {rx.diagnosis}
                                    </p>
                                  </div>
                                )}
                                <div>
                                  <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                    Medicines
                                  </h4>
                                  <p className="mt-1 whitespace-pre-wrap text-sm text-primary">
                                    {rx.medicines}
                                  </p>
                                </div>
                                {rx.instructions && (
                                  <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                      Instructions
                                    </h4>
                                    <p className="mt-1 whitespace-pre-wrap text-sm text-primary">
                                      {rx.instructions}
                                    </p>
                                  </div>
                                )}
                                {rx.appointmentId && (
                                  <p className="rounded-lg border border-text-secondary/10 bg-background/40 px-3 py-2 text-xs text-text-secondary">
                                    <span className="font-semibold text-primary/80">
                                      Linked appointment:{' '}
                                    </span>
                                    <span className="font-mono">{rx.appointmentId}</span>
                                  </p>
                                )}
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
  )
}
