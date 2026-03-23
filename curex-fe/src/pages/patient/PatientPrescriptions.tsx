import { useState, useEffect, useMemo, Fragment } from 'react'
import { Search, ChevronDown, ChevronUp, PillBottle } from 'lucide-react'
import { getPrescriptions } from '../../services/patientService'
import type { PatientPrescription } from '../../types/patient'

/* ── Mock patient ID (replace with auth when M1 ready) ── */
const MOCK_PATIENT_ID = 'p1'

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
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[s]}`}
    >
      {s}
    </span>
  )
}

export function PatientPrescriptions() {
  const [prescriptions, setPrescriptions] = useState<PatientPrescription[]>([])
  const [loading, setLoading] = useState(true)
  const [doctorFilter, setDoctorFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await getPrescriptions(MOCK_PATIENT_ID)
        if (!cancelled) setPrescriptions(data)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    return prescriptions.filter((rx) => {
      if (doctorFilter) {
        const name = (rx.doctorName ?? '').toLowerCase()
        if (!name.includes(doctorFilter.toLowerCase())) return false
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

  if (loading) {
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
            placeholder="Search doctor name…"
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
                        <td className="max-w-[10rem] truncate px-4 py-3 text-sm text-text-secondary sm:max-w-[14rem]">
                          {truncate(rx.medicines, 30)}
                        </td>
                        <td className="hidden max-w-[12rem] truncate px-4 py-3 text-sm text-text-secondary sm:table-cell">
                          {truncate(rx.instructions, 35)}
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
                          <td colSpan={7} className="px-4 py-4">
                            <div className="rounded-xl border border-text-secondary/10 bg-surface/80 p-4">
                              <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                  <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                    Medicines
                                  </h4>
                                  <p className="mt-1.5 text-sm text-primary">
                                    {rx.medicines}
                                  </p>
                                </div>
                                <div>
                                  <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                    Instructions
                                  </h4>
                                  <p className="mt-1.5 text-sm text-primary">
                                    {rx.instructions}
                                  </p>
                                </div>
                              </div>
                              <p className="mt-3 text-xs text-text-secondary">
                                Issued {formatDate(rx.issuedAt)}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-0">
                    <div className="patient-empty-state">
                      <p className="text-text-secondary">
                        No prescriptions found. Use filters to refine your
                        search.
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
