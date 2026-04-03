import { useState, useMemo, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, ClipboardList, Users, Clock } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { StatCard } from '../../components/doctor/StatCard'
import type {
  Appointment,
  Prescription,
  PrescriptionStatus,
  DashboardStats,
} from '../../types/doctor'
import '../../styles/pages/DoctorDashboard.css'
import { useAuth } from '../../store/hooks'
import { getDoctorByUserId } from '../../services/doctorService'
import { getAppointmentsByDoctor } from '../../services/appointmentService'
import { getPrescriptionsByDoctor } from '../../services/prescriptionService'
import type { AppointmentRecord } from '../../types/appointment'

const MOCK_STATS: DashboardStats = {
  todayAppointments: 5,
  pendingPrescriptions: 0,
  totalPatients: 48,
  availableSlots: 12,
  weeklyAppointments: [
    { day: 'Mon', confirmed: 4, pending: 1, completed: 3 },
    { day: 'Tue', confirmed: 6, pending: 2, completed: 5 },
    { day: 'Wed', confirmed: 3, pending: 0, completed: 4 },
    { day: 'Thu', confirmed: 5, pending: 1, completed: 6 },
    { day: 'Fri', confirmed: 7, pending: 2, completed: 4 },
    { day: 'Sat', confirmed: 2, pending: 1, completed: 1 },
    { day: 'Sun', confirmed: 0, pending: 0, completed: 0 },
  ],
}

const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: '1',
    patientId: 'p1',
    doctorId: 'd1',
    appointmentTime: '2025-03-23T09:00:00',
    status: 'CONFIRMED',
    type: 'TELEMEDICINE',
    patientName: 'John D.',
    sessionUrl: 'https://meet.example.com/room1',
  },
  {
    id: '2',
    patientId: 'p2',
    doctorId: 'd1',
    appointmentTime: '2025-03-23T10:30:00',
    status: 'CONFIRMED',
    type: 'IN_PERSON',
    patientName: 'Jane S.',
  },
  {
    id: '3',
    patientId: 'p3',
    doctorId: 'd1',
    appointmentTime: '2025-03-23T14:00:00',
    status: 'CONFIRMED',
    type: 'TELEMEDICINE',
    patientName: 'Mary K.',
    sessionUrl: 'https://meet.example.com/room2',
  },
]

const RECENT_RX_LIMIT = 2

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatRxIssued(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}, ${d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

function formatValidRange(from?: string, to?: string): string | null {
  if (!from?.trim() && !to?.trim()) return null
  const a = from?.trim()
    ? new Date(from).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: '2-digit',
      })
    : '—'
  const b = to?.trim()
    ? new Date(to).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: '2-digit',
      })
    : '—'
  return `${a} → ${b}`
}

function recentRxStatusLabel(status: PrescriptionStatus | undefined): string {
  const s = status ?? 'PENDING'
  if (s === 'ACTIVE') return 'Active'
  if (s === 'ISSUED') return 'Issued'
  if (s === 'COMPLETED') return 'Completed'
  if (s === 'CANCELLED') return 'Cancelled'
  return 'Pending'
}

function recentRxStatusClass(status: PrescriptionStatus | undefined): string {
  const s = status ?? 'PENDING'
  if (s === 'ACTIVE') {
    return 'recent-rx-status recent-rx-status--active'
  }
  if (s === 'ISSUED') {
    return 'recent-rx-status recent-rx-status--issued'
  }
  if (s === 'COMPLETED') return 'recent-rx-status recent-rx-status--completed'
  if (s === 'CANCELLED') return 'recent-rx-status recent-rx-status--cancelled'
  return 'recent-rx-status recent-rx-status--pending'
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const CHART_COLORS = {
  confirmed: 'var(--color-accent-sky)',
  pending: 'var(--color-accent-peach)',
  completed: 'var(--color-accent-mint)',
}

export function DoctorDashboard() {
  const { user } = useAuth()
  const greeting = getGreeting()
  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const doctorDisplayName =
    user?.role === 'DOCTOR' && user?.firstName
      ? `Dr. ${user.firstName}`
      : 'Dr. Silva'

  const [rxLoading, setRxLoading] = useState(true)
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])

  const loadPrescriptionInsights = useCallback(async () => {
    if (!user?.id || user.role !== 'DOCTOR') {
      setRxLoading(false)
      setAppointments([])
      setPrescriptions([])
      return
    }
    setRxLoading(true)
    try {
      const doctor = await getDoctorByUserId(user.id, user)
      const [apptList, rxList] = await Promise.all([
        getAppointmentsByDoctor(doctor.id),
        getPrescriptionsByDoctor(doctor.id),
      ])
      setAppointments(Array.isArray(apptList) ? apptList : [])
      setPrescriptions((Array.isArray(rxList) ? rxList : []) as Prescription[])
    } catch {
      setAppointments([])
      setPrescriptions([])
    } finally {
      setRxLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadPrescriptionInsights()
  }, [loadPrescriptionInsights])

  const pendingPrescriptionsCount = useMemo(() => {
    const eligible = appointments.filter(
      (a) => a.status === 'IN_SESSION' || a.status === 'COMPLETED'
    )
    const prescribedIds = new Set(
      prescriptions.map((rx) => rx.appointmentId).filter(Boolean)
    )
    return eligible.filter((a) => !prescribedIds.has(a.id)).length
  }, [appointments, prescriptions])

  const recentPrescriptions = useMemo(() => {
    return [...prescriptions]
      .sort(
        (a, b) =>
          new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
      )
      .slice(0, RECENT_RX_LIMIT)
  }, [prescriptions])

  const pendingTrend =
    pendingPrescriptionsCount > 0
      ? 'To be issued'
      : rxLoading
        ? 'Loading…'
        : 'All caught up'

  const pendingValue: number | string =
    rxLoading && user?.role === 'DOCTOR' ? '—' : pendingPrescriptionsCount

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Greeting banner */}
      <div>
        <h1 className="section-heading">
          {greeting}, {doctorDisplayName}
        </h1>
        <p className="section-subtext mt-1">{dateStr}</p>
      </div>

      {/* Stat cards */}
      <div className="dashboard-grid">
        <StatCard
          label="Today's Appointments"
          value={MOCK_STATS.todayAppointments}
          trend="▲ 2 more than yesterday"
          accent="sky"
          icon={Calendar}
        />
        <StatCard
          label="Pending Prescriptions"
          value={pendingValue}
          trend={pendingTrend}
          accent="peach"
          icon={ClipboardList}
        />
        <StatCard
          label="Total Patients"
          value={MOCK_STATS.totalPatients}
          trend="This month"
          accent="mint"
          icon={Users}
        />
        <StatCard
          label="Available Slots"
          value={`${MOCK_STATS.availableSlots}/20`}
          trend="This week"
          accent="primary-light"
          icon={Clock}
        />
      </div>

      {/* Two-column layout: Appointments + Quick Rx */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Appointments Today */}
        <div
          className="rounded-2xl bg-surface p-5 lg:p-6"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <h2 className="text-lg font-semibold text-primary">
            Appointments Today
          </h2>
          {MOCK_APPOINTMENTS.length > 0 ? (
            <ul className="mt-4 space-y-3" role="list">
              {MOCK_APPOINTMENTS.map((apt) => (
                <li
                  key={apt.id}
                  className="schedule-row flex flex-wrap items-center justify-between gap-2 rounded-xl border border-text-secondary/10 bg-background/50 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="font-medium text-primary">
                      {formatTime(apt.appointmentTime)}
                    </span>
                    <span className="text-text-secondary">
                      {apt.patientName ?? 'Patient'}
                    </span>
                    <span
                      className={`schedule-badge rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        apt.type === 'TELEMEDICINE'
                          ? 'bg-accent-sky/20 text-primary'
                          : 'bg-accent-mint/20 text-primary'
                      }`}
                    >
                      {apt.type === 'TELEMEDICINE' ? 'Video' : 'In-person'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {apt.type === 'TELEMEDICINE' && apt.sessionUrl && (
                      <a
                        href={apt.sessionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary text-xs"
                      >
                        Join
                      </a>
                    )}
                    <button type="button" className="btn-secondary text-xs">
                      Prescribe
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-text-secondary/20 bg-background/50 px-6 py-10 text-center">
              <p className="text-text-secondary">
                No appointments today — enjoy the break!
              </p>
            </div>
          )}
        </div>

        {/* Recent Prescriptions (backend) */}
        <div
          className="rounded-2xl bg-surface p-5 lg:p-6"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <h2 className="text-lg font-semibold text-primary">
            Recent Prescriptions
          </h2>
          {user?.role !== 'DOCTOR' ? (
            <div className="mt-6 rounded-xl border border-dashed border-text-secondary/20 bg-background/50 px-6 py-10 text-center">
              <p className="text-text-secondary">
                Sign in as a doctor to see recent prescriptions.
              </p>
            </div>
          ) : rxLoading ? (
            <ul className="mt-4 space-y-2" role="list" aria-busy="true">
              {Array.from({ length: RECENT_RX_LIMIT }).map((_, i) => (
                <li
                  key={i}
                  className="h-[3.5rem] animate-pulse rounded-xl border border-text-secondary/10 bg-background/70"
                />
              ))}
            </ul>
          ) : recentPrescriptions.length > 0 ? (
            <>
              <ul className="recent-rx-list mt-4 space-y-2" role="list">
                {recentPrescriptions.map((rx) => {
                  const patient =
                    rx.patientName?.trim() || rx.patientId || 'Patient'
                  const validRange = formatValidRange(rx.validFrom, rx.validTo)
                  const diagnosis = rx.diagnosis?.trim()
                  return (
                    <li key={rx.id}>
                      <article className="recent-rx-card">
                        <header className="recent-rx-card__head">
                          <p className="recent-rx-card__patient min-w-0 truncate">
                            <span className="text-text-secondary">Patient:</span>{' '}
                            <span className="font-semibold text-primary">
                              {patient}
                            </span>
                          </p>
                          <span
                            className={recentRxStatusClass(rx.status)}
                            title="Prescription status"
                          >
                            {recentRxStatusLabel(rx.status)}
                          </span>
                        </header>
                        <table className="recent-rx-table">
                          <tbody>
                            <tr>
                              <th scope="row">Issued</th>
                              <td>
                                <time dateTime={rx.issuedAt}>
                                  {formatRxIssued(rx.issuedAt)}
                                </time>
                              </td>
                            </tr>
                            <tr>
                              <th scope="row">Diagnosis</th>
                              <td
                                className={
                                  diagnosis
                                    ? 'recent-rx-table__clamp-2'
                                    : 'text-text-secondary'
                                }
                              >
                                {diagnosis || '—'}
                              </td>
                            </tr>
                            {validRange && (
                              <tr>
                                <th scope="row">Valid</th>
                                <td>{validRange}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </article>
                    </li>
                  )
                })}
              </ul>
              <Link
                to="/doctor/prescriptions"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-light transition-colors hover:text-primary hover:underline"
              >
                View all →
              </Link>
            </>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-text-secondary/20 bg-background/50 px-6 py-10 text-center">
              <p className="text-text-secondary">
                No recent prescriptions yet.
              </p>
              <Link
                to="/doctor/prescriptions"
                className="mt-3 inline-flex text-sm font-medium text-primary-light hover:underline"
              >
                Issue a prescription
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Weekly Overview chart */}
      <div
        className="rounded-2xl bg-surface p-5 lg:p-6"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <h2 className="text-lg font-semibold text-primary">
          Weekly Overview
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Appointments per day this week
        </p>
        <div className="mt-4 h-64 min-h-[200px] w-full lg:h-72">
          <ResponsiveContainer width="100%" height="100%" minHeight={200}>
            <BarChart
              data={MOCK_STATS.weeklyAppointments}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgb(107 114 128 / 0.2)"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                axisLine={{ stroke: 'rgb(107 114 128 / 0.2)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid rgb(107 114 128 / 0.2)',
                }}
                formatter={(value, name) => [
                  value ?? 0,
                  typeof name === 'string'
                    ? name.charAt(0).toUpperCase() + name.slice(1)
                    : String(name),
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value) =>
                  value.charAt(0).toUpperCase() + value.slice(1)
                }
              />
              <Bar dataKey="confirmed" stackId="a" fill={CHART_COLORS.confirmed} />
              <Bar dataKey="pending" stackId="a" fill={CHART_COLORS.pending} />
              <Bar
                dataKey="completed"
                stackId="a"
                fill={CHART_COLORS.completed}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
