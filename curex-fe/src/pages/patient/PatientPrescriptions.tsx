import { useState, useEffect, useMemo, Fragment, useCallback } from 'react'
import { Search, ChevronDown, ChevronUp, PillBottle } from 'lucide-react'
import { getPrescriptions, getPatientByUserId } from '../../services/patientService'
import type { PatientPrescription } from '../../types/patient'
import { useAuth } from '../../store/hooks'
import { useToast } from '../../store/hooks'

/** Use mock data when backend is unavailable (e.g. during development). */
const USE_MOCK_ON_ERROR = true

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

function truncate(str: string, maxLen: number): string {
  if (!str) return ''
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen) + '…'
}

const STATUS_STYLES = {
  ACTIVE: 'bg-accent-mint/20 text-primary border-accent-mint/40',
  COMPLETED: 'bg-accent-sky/20 text-primary border-accent-sky/40',
  CANCELLED: 'bg-error/20 text-primary border-error/40',
} as const

function StatusBadge({
  status,
}: {
  status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
}) {
  const s = status ?? 'ACTIVE'
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[s] ?? 'bg-background/50'}`}
    >
      {s}
    </span>
  )
}

export function PatientPrescriptions() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [patientId, setPatientId] = useState<string | null>(null)
  const [prescriptions, setPrescriptions] = useState<PatientPrescription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [doctorFilter, setDoctorFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchPrescriptions = useCallback(async () => {
    if (!user?.id || user.role !== 'PATIENT') return
    setLoading(true)
    setError(null)
    try {
      const patient = await getPatientByUserId(user.id)
      setPatientId(patient.id)
      const data = await getPrescriptions(patient.id)
      setPrescriptions(data)
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
  }, [user?.id, user?.role, toast])

  useEffect(() => {
    fetchPrescriptions()
  }, [fetchPrescriptions])

  const filtered = useMemo(() => {
    return prescriptions.filter((rx) => {
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
  }, [prescriptions, doctorFilter, dateFrom, dateTo])

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

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

      {/* Search / filter bar */}
      <div className="patient-card flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-[12rem]">
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
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="patient-page-input"
          title="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="patient-page-input"
          title="To date"
        />
      </div>

      {/* Prescriptions table */}
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
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">
                  Doctor
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium text-text-secondary sm:table-cell">
                  Specialty
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">
                  Medicines
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium text-text-secondary sm:table-cell">
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
              {filtered.length > 0 ? (
                filtered.map((rx) => {
                  const isExpanded = expandedId === rx.id
                  return (
                    <Fragment key={rx.id}>
                      <tr
                        key={rx.id}
                        className="border-b border-text-secondary/10 transition-colors hover:bg-background/50"
                      >
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
                          {formatDateShort(rx.issuedAt)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-primary">
                          {rx.doctorName ?? '—'}
                        </td>
                        <td className="hidden px-4 py-3 text-sm text-text-secondary sm:table-cell">
                          {rx.doctorSpecialty ?? '—'}
                        </td>
                        <td className="max-w-[10rem] truncate px-4 py-3 text-sm text-text-secondary sm:max-w-[14rem]">
                          {truncate(rx.medicines, 30)}
                        </td>
                        <td className="hidden max-w-[12rem] truncate px-4 py-3 text-sm text-text-secondary sm:table-cell">
                          {truncate(rx.instructions ?? '', 35)}
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
                        <tr
                          key={`${rx.id}-expanded`}
                          className="border-b border-text-secondary/10 bg-background/30"
                        >
                          <td colSpan={8} className="px-4 py-4">
                            <div className="rounded-xl border border-text-secondary/10 bg-surface/80 p-4">
                              {/* Rich Prescription View */}
                              <div className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                  <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                      Prescription ID
                                    </h4>
                                    <p className="mt-1 text-sm font-mono text-primary">
                                      {rx.id}
                                    </p>
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                      Issue date
                                    </h4>
                                    <p className="mt-1 text-sm text-primary">
                                      {formatDate(rx.issuedAt)}
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
                                      Doctor
                                    </h4>
                                    <p className="mt-1 text-sm font-medium text-primary">
                                      {rx.doctorName ?? '—'}
                                    </p>
                                    {rx.doctorSpecialty && (
                                      <p className="mt-0.5 text-xs text-text-secondary">
                                        {rx.doctorSpecialty}
                                      </p>
                                    )}
                                  </div>
                                  {(rx.validFrom || rx.validTo) && (
                                    <div>
                                      <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                        Valid period
                                      </h4>
                                      <p className="mt-1 text-sm text-primary">
                                        {rx.validFrom && rx.validTo
                                          ? `${formatDate(rx.validFrom)} – ${formatDate(rx.validTo)}`
                                          : rx.validFrom
                                            ? `From ${formatDate(rx.validFrom)}`
                                            : rx.validTo
                                              ? `Until ${formatDate(rx.validTo)}`
                                              : '—'}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                {rx.diagnosis && (
                                  <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                      Diagnosis
                                    </h4>
                                    <p className="mt-1 text-sm text-primary">
                                      {rx.diagnosis}
                                    </p>
                                  </div>
                                )}
                                <div>
                                  <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                    Medicines
                                  </h4>
                                  <p className="mt-1 text-sm text-primary whitespace-pre-wrap">
                                    {rx.medicines}
                                  </p>
                                </div>
                                {rx.instructions && (
                                  <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                      Instructions
                                    </h4>
                                    <p className="mt-1 text-sm text-primary whitespace-pre-wrap">
                                      {rx.instructions}
                                    </p>
                                  </div>
                                )}
                                {rx.appointmentId && (
                                  <p className="text-xs text-text-secondary">
                                    Appointment reference: {rx.appointmentId}
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
                  <td colSpan={8} className="p-0">
                    <div className="patient-empty-state">
                      <p className="text-text-secondary">
                        {loading
                          ? 'Loading prescriptions…'
                          : 'No prescriptions found. Use filters to refine your search.'}
                      </p>
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
