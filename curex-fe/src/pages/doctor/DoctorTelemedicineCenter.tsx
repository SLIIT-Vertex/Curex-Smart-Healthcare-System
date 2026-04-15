import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  ChevronDown,
  Eye,
  ListFilter,
  Maximize2,
  Minimize2,
  RefreshCcw,
  Search,
  Video,
  X,
} from 'lucide-react'
import { getAppointmentsByDoctor } from '../../services/appointmentService'
import {
  createTelemedicineSession,
  endTelemedicineSession,
  getTelemedicineSession,
} from '../../services/telemedicineService'
import type { AppointmentRecord } from '../../types/appointment'
import type { TelemedicineSessionRecord } from '../../types/telemedicine'
import telemedImage from '../../assets/telemed/telemed.png'
import { useAuth, useToast } from '../../store/hooks'

function canJoin(
  appointment: AppointmentRecord | null,
  session: TelemedicineSessionRecord | null
): boolean {
  if (!appointment || appointment.type !== 'TELEMEDICINE' || !session?.sessionUrl) {
    return false
  }

  const statusEligible =
    appointment.status === 'CONFIRMED' || appointment.status === 'IN_SESSION'
  const joinOpensAt = new Date(appointment.appointmentTime).getTime() - 60 * 60 * 1000
  const startsWithinOneHour = Date.now() >= joinOpensAt

  return statusEligible && startsWithinOneHour
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return '-'
  }

  const raw = String(value).trim()
  const hasZone = /[zZ]$|[+-]\d{2}:\d{2}$/.test(raw)
  const utcAware = hasZone ? raw : `${raw}Z`
  const date = new Date(utcAware)
  const parsed = Number.isNaN(date.getTime()) ? new Date(raw) : date
  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }

  return `${parsed.toLocaleDateString('en-GB')} ${parsed.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

function formatTime(value?: string | null): string {
  if (!value) {
    return '-'
  }

  const raw = String(value).trim()
  const hasZone = /[zZ]$|[+-]\d{2}:\d{2}$/.test(raw)
  const utcAware = hasZone ? raw : `${raw}Z`
  const date = new Date(utcAware)
  const parsed = Number.isNaN(date.getTime()) ? new Date(raw) : date
  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }

  return parsed.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatBookedAppointmentTime(value?: string | null): string {
  if (!value) {
    return '-'
  }

  const match = String(value).match(/^\d{4}-\d{2}-\d{2}T(\d{2}:\d{2})/)
  if (match?.[1]) {
    return match[1]
  }

  return formatTime(value)
}

function appointmentDateTime(appointment: AppointmentRecord): string {
  const dt = new Date(appointment.appointmentTime)
  return `${dt.toLocaleDateString('en-GB')} ${dt.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

function meetingTitle(appointment: AppointmentRecord): string {
  const patient = appointment.patientName ?? appointment.patientId
  const date = new Date(appointment.appointmentTime).toLocaleDateString('en-GB')
  return `Consultation with ${patient} - ${date}`
}

function joinAvailability(appointment: AppointmentRecord): string {
  if (isCanceled(appointment.status)) {
    return 'Canceled'
  }

  if (appointment.status !== 'CONFIRMED' && appointment.status !== 'IN_SESSION') {
    return 'Waiting for confirmation'
  }

  const joinOpensAt = new Date(appointment.appointmentTime).getTime() - 60 * 60 * 1000
  if (Date.now() >= joinOpensAt) {
    return 'Available now'
  }

  return `Available at ${formatDateTime(new Date(joinOpensAt).toISOString())}`
}

function queueStatus(
  appointment: AppointmentRecord,
  session: TelemedicineSessionRecord | null | undefined
): string {
  if (session?.status === 'ENDED') {
    return 'ENDED'
  }
  return String(appointment.status)
}

function toDateInputValue(value: string): string {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function queueStatusBadgeClass(status: string): string {
  const normalized = status.toUpperCase()
  if (normalized === 'CONFIRMED') {
    return 'bg-accent-mint/25 text-primary'
  }
  if (normalized === 'PENDING') {
    return 'bg-accent-peach/30 text-primary'
  }
  if (normalized === 'IN_SESSION') {
    return 'bg-accent-sky/25 text-primary'
  }
  if (normalized === 'COMPLETED' || normalized === 'ENDED') {
    return 'bg-primary-light/15 text-primary'
  }
  if (normalized === 'CANCELED' || normalized === 'CANCELLED') {
    return 'bg-error/20 text-primary'
  }
  return 'bg-primary-light/10 text-primary'
}

function isCanceled(status: string | null | undefined): boolean {
  return status === 'CANCELED' || status === 'CANCELLED'
}

export function DoctorTelemedicineCenter() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([])
  const [activeTab, setActiveTab] = useState<'queue' | 'meeting'>('queue')
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)
  const [confirmEndOpen, setConfirmEndOpen] = useState(false)
  const [sessions, setSessions] = useState<Record<string, TelemedicineSessionRecord | null>>(
    {}
  )
  const [page, setPage] = useState(1)
  const perPage = 10
  const [queueSearch, setQueueSearch] = useState('')
  const [queueStatusFilter, setQueueStatusFilter] = useState<
    'ALL' | 'PENDING' | 'CONFIRMED' | 'IN_SESSION' | 'COMPLETED' | 'CANCELED'
  >('ALL')
  const [queueDateFilter, setQueueDateFilter] = useState('')
  const [endedExpanded, setEndedExpanded] = useState(false)
  const [endedPage, setEndedPage] = useState(1)
  const [endedSearch, setEndedSearch] = useState('')
  const [endedDateFilter, setEndedDateFilter] = useState('')
  const endedPerPage = 6
  const [fullScreen, setFullScreen] = useState(false)
  const [loading, setLoading] = useState(true)
  const meetingPanelRef = useRef<HTMLDivElement | null>(null)

  const teleAppointments = useMemo(
    () =>
      appointments
        .filter((appt) => appt.type === 'TELEMEDICINE')
        .sort(
          (a, b) =>
            new Date(a.appointmentTime).getTime() -
            new Date(b.appointmentTime).getTime()
        ),
    [appointments]
  )

  const activeTeleAppointments = useMemo(
    () => teleAppointments.filter((appt) => sessions[appt.id]?.status !== 'ENDED'),
    [teleAppointments, sessions]
  )

  const endedTeleAppointments = useMemo(
    () => teleAppointments.filter((appt) => sessions[appt.id]?.status === 'ENDED'),
    [teleAppointments, sessions]
  )

  const meetingAppointment = useMemo(
    () => teleAppointments.find((appt) => appt.id === selectedAppointmentId) ?? null,
    [teleAppointments, selectedAppointmentId]
  )

  const filteredActiveTeleAppointments = useMemo(() => {
    const term = queueSearch.trim().toLowerCase()
    return activeTeleAppointments.filter((appt) => {
      const rawStatus = queueStatus(appt, sessions[appt.id] ?? null).toUpperCase()
      const normalizedStatus = rawStatus === 'CANCELLED' ? 'CANCELED' : rawStatus

      if (queueStatusFilter !== 'ALL' && normalizedStatus !== queueStatusFilter) {
        return false
      }

      if (queueDateFilter && toDateInputValue(appt.appointmentTime) !== queueDateFilter) {
        return false
      }

      if (!term) {
        return true
      }

      return [
        appt.id,
        appt.patientName,
        appt.patientId,
        meetingTitle(appt),
        normalizedStatus,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
    })
  }, [activeTeleAppointments, queueDateFilter, queueSearch, queueStatusFilter, sessions])

  const queueTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredActiveTeleAppointments.length / perPage)),
    [filteredActiveTeleAppointments.length, perPage]
  )

  const paginatedActiveTeleAppointments = useMemo(() => {
    const start = (page - 1) * perPage
    return filteredActiveTeleAppointments.slice(start, start + perPage)
  }, [filteredActiveTeleAppointments, page, perPage])

  const filteredEndedTeleAppointments = useMemo(() => {
    const term = endedSearch.trim().toLowerCase()
    return endedTeleAppointments.filter((appt) => {
      const session = sessions[appt.id] ?? null

      if (endedDateFilter && toDateInputValue(appt.appointmentTime) !== endedDateFilter) {
        return false
      }

      if (!term) {
        return true
      }

      return [
        appt.id,
        appt.patientName,
        appt.patientId,
        meetingTitle(appt),
        appointmentDateTime(appt),
        formatDateTime(session?.endedAt),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
    })
  }, [endedDateFilter, endedSearch, endedTeleAppointments, sessions])

  const endedTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredEndedTeleAppointments.length / endedPerPage)),
    [endedPerPage, filteredEndedTeleAppointments.length]
  )

  const paginatedEndedTeleAppointments = useMemo(() => {
    const start = (endedPage - 1) * endedPerPage
    return filteredEndedTeleAppointments.slice(start, start + endedPerPage)
  }, [endedPage, endedPerPage, filteredEndedTeleAppointments])

  useEffect(() => {
    setPage(1)
  }, [queueDateFilter, queueSearch, queueStatusFilter])

  useEffect(() => {
    setEndedPage(1)
  }, [endedDateFilter, endedSearch])

  useEffect(() => {
    if (page > queueTotalPages) {
      setPage(queueTotalPages)
    }
  }, [page, queueTotalPages])

  useEffect(() => {
    if (endedPage > endedTotalPages) {
      setEndedPage(endedTotalPages)
    }
  }, [endedPage, endedTotalPages])

  useEffect(() => {
    if (!meetingAppointment) {
      return
    }

    const session = sessions[meetingAppointment.id]
    if (session?.status === 'ENDED' || isCanceled(meetingAppointment.status)) {
      setSelectedAppointmentId(null)
      setActiveTab('queue')
    }
  }, [meetingAppointment, sessions])

  async function load() {
    try {
      setLoading(true)

      if (!user?.id) {
        toast('Please login as a doctor to access telemedicine.', 'error')
        setAppointments([])
        setSessions({})
        setLoading(false)
        return
      }

      const appts = await getAppointmentsByDoctor(user.id)
      setAppointments(appts)

      const tele = appts.filter((appt) => appt.type === 'TELEMEDICINE')
      const entries = await Promise.all(
        tele.map(async (appt) => {
          try {
            const existing = await getTelemedicineSession(appt.id)
            if (existing) {
              return [appt.id, existing] as const
            }

            const created = await createTelemedicineSession(appt.id, {
              patientId: appt.patientId,
              doctorId: appt.doctorId,
            })
            return [appt.id, created] as const
          } catch {
            return [appt.id, null] as const
          }
        })
      )

      const next: Record<string, TelemedicineSessionRecord | null> = {}
      for (const [id, session] of entries) {
        next[id] = session
      }
      setSessions(next)
    } catch {
      toast('Could not load telemedicine appointments right now.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const onFullScreenChange = () => {
      setFullScreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFullScreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullScreenChange)
  }, [])

  async function toggleFullScreen() {
    if (!meetingPanelRef.current) {
      return
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }

    await meetingPanelRef.current.requestFullscreen()
  }

  async function handleEndSession() {
    if (!meetingAppointment) {
      return
    }

    try {
      const ended = await endTelemedicineSession(meetingAppointment.id, {
        endedBy: 'DOCTOR',
        markAppointmentCompleted: true,
      })

      setSessions((prev) => ({
        ...prev,
        [meetingAppointment.id]: ended,
      }))
      toast('Session has been ended successfully.', 'success')
      setConfirmEndOpen(false)
      await load()
    } catch {
      setConfirmEndOpen(false)
      toast('Could not end session. Please try again.', 'error')
    }
  }

  const meetingSession = meetingAppointment ? sessions[meetingAppointment.id] ?? null : null
  const roomJoinable = canJoin(meetingAppointment, meetingSession)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="section-heading">Doctor Telemedicine</h1>
          <p className="section-subtext mt-1">
            Meet patients inside Curex without leaving the dashboard.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/doctor/availability"
            className="rounded-lg border border-text-secondary/20 px-3 py-2 text-sm font-medium text-text-secondary transition hover:text-primary"
          >
            Booked Appointments
          </Link>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border border-text-secondary/20 px-3 py-2 text-sm font-medium text-text-secondary transition hover:text-primary"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div className="appointment-panel p-5 text-sm text-text-secondary">Loading telemedicine data...</div>
      )}

      <div className="space-y-4">
          <div className="inline-flex rounded-xl border border-text-secondary/20 bg-surface p-1">
            <button
              type="button"
              onClick={() => setActiveTab('queue')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeTab === 'queue'
                  ? 'bg-primary-light/10 text-primary'
                  : 'text-text-secondary hover:text-primary'
              }`}
            >
              Video Queue
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('meeting')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeTab === 'meeting'
                  ? 'bg-primary-light/10 text-primary'
                  : 'text-text-secondary hover:text-primary'
              }`}
            >
              Meeting Room
            </button>
          </div>

          {activeTab === 'queue' && (
            <div className="appointment-panel p-4">
              <h2 className="text-base font-semibold text-primary">Video Queue</h2>
              <div className="mt-3 grid gap-3 md:flex md:items-center">
                <label className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                  <input
                    value={queueSearch}
                    onChange={(e) => setQueueSearch(e.target.value)}
                    placeholder="Search by patient, title, status"
                    className="patient-page-input w-full border-text-secondary/20 bg-surface pl-10 shadow-sm"
                  />
                </label>
                <label className="relative md:w-64">
                  <ListFilter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                  <select
                    value={queueStatusFilter}
                    onChange={(e) =>
                      setQueueStatusFilter(
                        e.target.value as
                          | 'ALL'
                          | 'PENDING'
                          | 'CONFIRMED'
                          | 'IN_SESSION'
                          | 'COMPLETED'
                          | 'CANCELED'
                      )
                    }
                    className="patient-page-input w-full appearance-none border-primary-light/30 bg-primary-light/5 pl-10 pr-10 font-medium text-primary shadow-sm outline-none transition-all hover:border-primary-light/60 hover:bg-primary-light/10 focus:ring-2 focus:ring-primary-light/20"
                  >
                    <option value="ALL">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="IN_SESSION">In Session</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELED">Canceled</option>
                  </select>
                </label>
                <label className="relative md:w-52">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                  <input
                    type="date"
                    value={queueDateFilter}
                    onChange={(e) => setQueueDateFilter(e.target.value)}
                    className="calendar-filter-input patient-page-input w-full border-primary-light/30 bg-primary-light/5 pl-10 pr-3 font-medium text-primary shadow-sm outline-none transition-all hover:border-primary-light/60 hover:bg-primary-light/10 focus:ring-2 focus:ring-primary-light/20"
                  />
                </label>
              </div>
              <div className="mt-3 rounded-2xl border border-text-secondary/15 bg-background/40 p-3">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-text-secondary/20 text-text-secondary">
                      <th className="px-3 py-2 font-medium">Title</th>
                      <th className="px-3 py-2 font-medium">Date & Time</th>
                      <th className="px-3 py-2 font-medium">Patient</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Meeting Link</th>
                      <th className="px-3 py-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActiveTeleAppointments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-5 text-center text-text-secondary">
                          No telemedicine appointments available yet.
                        </td>
                      </tr>
                    )}

                    {paginatedActiveTeleAppointments.map((appt) => {
                      const session = sessions[appt.id] ?? null
                      const joinable = canJoin(appt, session)
                      const ended = session?.status === 'ENDED'
                      const canceled = isCanceled(appt.status)
                      const disabled = ended || canceled

                      return (
                        <tr key={appt.id} className="border-b border-text-secondary/10">
                          <td className="px-3 py-2 font-medium text-primary">{meetingTitle(appt)}</td>
                          <td className="px-3 py-2">{appointmentDateTime(appt)}</td>
                          <td className="px-3 py-2">{appt.patientName ?? appt.patientId}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${queueStatusBadgeClass(queueStatus(appt, session))}`}>
                              {queueStatus(appt, session)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs text-text-secondary">
                            {joinable ? 'Available' : joinAvailability(appt)}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAppointmentId(appt.id)
                                  setActiveTab('meeting')
                                }}
                                disabled={disabled}
                                className="inline-flex items-center rounded-lg border border-primary-light/40 bg-primary-light/10 p-2 text-primary transition hover:bg-primary-light/20 disabled:cursor-not-allowed disabled:opacity-50"
                                title={ended ? 'Meeting ended' : canceled ? 'Meeting canceled' : 'View meeting'}
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="mt-3 flex items-center justify-between text-sm text-text-secondary">
                  <div>
                    Showing {filteredActiveTeleAppointments.length === 0 ? 0 : (page - 1) * perPage + 1} - {Math.min(page * perPage, filteredActiveTeleAppointments.length)} of {filteredActiveTeleAppointments.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>
                    <span className="px-2">Page {page} / {queueTotalPages}</span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(queueTotalPages, p + 1))}
                      disabled={page >= queueTotalPages}
                      className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>

              {endedTeleAppointments.length > 0 && (
                <div className="mt-5 rounded-2xl border border-text-secondary/15 bg-background/40 p-3">
                  <button
                    type="button"
                    onClick={() => setEndedExpanded((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-xl border border-text-secondary/15 bg-surface px-3 py-2 text-left"
                  >
                    <h3 className="text-sm font-semibold text-primary">
                      Ended Video Sessions ({endedTeleAppointments.length})
                    </h3>
                    <ChevronDown
                      className={`h-4 w-4 text-text-secondary transition-transform ${endedExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {endedExpanded && (
                    <>
                      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_220px]">
                        <label className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                          <input
                            value={endedSearch}
                            onChange={(e) => setEndedSearch(e.target.value)}
                            placeholder="Search ended sessions"
                            className="patient-page-input w-full border-text-secondary/20 bg-surface pl-10 shadow-sm"
                          />
                        </label>
                        <label className="relative">
                          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                          <input
                            type="date"
                            value={endedDateFilter}
                            onChange={(e) => setEndedDateFilter(e.target.value)}
                            className="calendar-filter-input patient-page-input w-full border-primary-light/30 bg-primary-light/5 pl-10 pr-3 font-medium text-primary shadow-sm outline-none transition-all hover:border-primary-light/60 hover:bg-primary-light/10 focus:ring-2 focus:ring-primary-light/20"
                          />
                        </label>
                      </div>

                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full min-w-[52rem] text-left text-sm">
                          <thead>
                            <tr className="border-b border-text-secondary/20 text-text-secondary">
                              <th className="px-3 py-2 font-medium">Title</th>
                              <th className="px-3 py-2 font-medium">Date</th>
                              <th className="px-3 py-2 font-medium">Start Time</th>
                              <th className="px-3 py-2 font-medium">End Time</th>
                              <th className="px-3 py-2 font-medium">End Date Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedEndedTeleAppointments.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-3 py-5 text-center text-text-secondary">
                                  No ended sessions match your filters.
                                </td>
                              </tr>
                            ) : (
                              paginatedEndedTeleAppointments.map((appt) => {
                                const session = sessions[appt.id] ?? null
                                return (
                                  <tr key={`ended-${appt.id}`} className="border-b border-text-secondary/10">
                                    <td className="px-3 py-2 font-medium text-primary">{meetingTitle(appt)}</td>
                                    <td className="px-3 py-2">{new Date(appt.appointmentTime).toLocaleDateString('en-GB')}</td>
                                    <td className="px-3 py-2">{formatBookedAppointmentTime(appt.appointmentTime)}</td>
                                    <td className="px-3 py-2">{formatTime(session?.endedAt)}</td>
                                    <td className="px-3 py-2">{formatDateTime(session?.endedAt)}</td>
                                  </tr>
                                )
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-sm text-text-secondary">
                        <div>
                          Showing {filteredEndedTeleAppointments.length === 0 ? 0 : (endedPage - 1) * endedPerPage + 1} - {Math.min(endedPage * endedPerPage, filteredEndedTeleAppointments.length)} of {filteredEndedTeleAppointments.length}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEndedPage((p) => Math.max(1, p - 1))}
                            disabled={endedPage === 1}
                            className="rounded-lg border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Prev
                          </button>
                          <span className="px-2">Page {endedPage} / {endedTotalPages}</span>
                          <button
                            type="button"
                            onClick={() => setEndedPage((p) => Math.min(endedTotalPages, p + 1))}
                            disabled={endedPage >= endedTotalPages}
                            className="rounded-lg border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'meeting' && (
            meetingAppointment ? (
            <div className="grid gap-4 xl:grid-cols-[320px_1.7fr]">
              <aside className="appointment-panel p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-base font-semibold text-primary">Meeting Details</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('queue')
                      setSelectedAppointmentId(null)
                    }}
                    className="rounded-lg border border-text-secondary/20 p-1.5 text-text-secondary hover:text-primary"
                    title="Close meeting window"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 space-y-2 text-sm">
                  <p><span className="font-medium text-primary">Title:</span> {meetingTitle(meetingAppointment)}</p>
                  <p><span className="font-medium text-primary">Patient:</span> {meetingAppointment.patientName ?? meetingAppointment.patientId}</p>
                  <p><span className="font-medium text-primary">Scheduled:</span> {appointmentDateTime(meetingAppointment)}</p>
                  <p><span className="font-medium text-primary">Status:</span> {queueStatus(meetingAppointment, meetingSession)}</p>
                  <p><span className="font-medium text-primary">End Time:</span> {formatDateTime(meetingSession?.endedAt)}</p>
                  <p><span className="font-medium text-primary">Availability:</span> {roomJoinable ? 'Available now' : joinAvailability(meetingAppointment)}</p>
                </div>

                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    onClick={toggleFullScreen}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-text-secondary/20 px-3 py-2 text-sm font-medium text-text-secondary transition hover:text-primary"
                  >
                    {fullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    {fullScreen ? 'Exit Full Screen' : 'Full Screen'}
                  </button>

                  {meetingSession?.status !== 'ENDED' && (
                    <button
                      type="button"
                      onClick={() => setConfirmEndOpen(true)}
                      className="inline-flex items-center justify-center rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm font-medium text-primary transition hover:bg-error/20"
                    >
                      End Session
                    </button>
                  )}
                </div>
              </aside>

              <section ref={meetingPanelRef} className="appointment-panel relative overflow-hidden p-0">
                {roomJoinable && meetingSession?.sessionUrl ? (
                  <>
                    <iframe
                      title={meetingTitle(meetingAppointment)}
                      src={meetingSession.sessionUrl}
                      className="relative z-10 h-[78vh] min-h-[560px] w-full"
                      allow="camera; microphone; fullscreen; display-capture"
                    />
                    <div className="absolute inset-0 z-[5] flex items-center justify-center bg-background/90 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <img
                          src={telemedImage}
                          alt="Telemedicine"
                          className="h-32 w-auto opacity-10 grayscale"
                        />
                        <p className="text-sm text-text-secondary">Session has disconnected or ended.</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex h-[78vh] min-h-[560px] flex-col items-center justify-center gap-4 bg-background/60 px-6 text-center">
                    <img
                      src={telemedImage}
                      alt="Telemedicine"
                      className="h-44 w-auto max-w-full object-contain"
                    />
                    <div className="space-y-1">
                      <h2 className="text-xl font-semibold text-primary">Room is not open yet</h2>
                      <p className="max-w-lg text-sm text-text-secondary">
                        The meeting link becomes active 1 hour before the appointment time after confirmation.
                      </p>
                    </div>
                    <Video className="h-8 w-8 text-primary-light" />
                  </div>
                )}
              </section>
            </div>
            ) : (
              <div className="appointment-panel p-6 text-sm text-text-secondary">
                No meeting selected. Open one from the Video Queue when appointments are available.
              </div>
            )
          )}
        </div>


      {confirmEndOpen && (
        <div className="fixed inset-0 z-150 flex items-center justify-center bg-primary/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-surface p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-lg font-semibold text-primary">End Session?</h3>
            <p className="mt-2 text-sm text-text-secondary">
              Are you sure you want to end this telemedicine session?
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmEndOpen(false)}
                className="rounded-lg border border-text-secondary/20 px-3 py-2 text-sm text-text-secondary hover:text-primary"
              >
                No
              </button>
              <button
                type="button"
                onClick={handleEndSession}
                className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm font-medium text-primary hover:bg-error/20"
              >
                Yes, End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
