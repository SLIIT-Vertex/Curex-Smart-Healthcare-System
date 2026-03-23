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
import type { Appointment, Prescription, DashboardStats } from '../../types/doctor'
import '../../styles/pages/DoctorDashboard.css'

/* ── Mock data ── */

const MOCK_STATS: DashboardStats = {
  todayAppointments: 5,
  pendingPrescriptions: 2,
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

const MOCK_PRESCRIPTIONS: Prescription[] = [
  {
    id: 'rx1',
    doctorId: 'd1',
    patientId: 'p1',
    appointmentId: '1',
    medicines: 'Paracetamol 500mg',
    instructions: 'Take twice daily with food',
    issuedAt: '2025-03-22T10:00:00',
  },
  {
    id: 'rx2',
    doctorId: 'd1',
    patientId: 'p2',
    appointmentId: '2',
    medicines: 'Amoxicillin 250mg',
    instructions: 'One capsule three times daily for 7 days',
    issuedAt: '2025-03-21T14:30:00',
  },
]

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
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
  const greeting = getGreeting()
  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Greeting banner */}
      <div>
        <h1 className="section-heading">
          {greeting}, Dr. Silva
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
          value={MOCK_STATS.pendingPrescriptions}
          trend="To be issued"
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

        {/* Recent Prescriptions */}
        <div
          className="rounded-2xl bg-surface p-5 lg:p-6"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <h2 className="text-lg font-semibold text-primary">
            Recent Prescriptions
          </h2>
          {MOCK_PRESCRIPTIONS.length > 0 ? (
            <>
              <ul className="mt-4 space-y-2" role="list">
                {MOCK_PRESCRIPTIONS.map((rx) => (
                  <li
                    key={rx.id}
                    className="rounded-lg border border-text-secondary/10 px-4 py-3 text-sm"
                  >
                    <p className="font-medium text-primary">{rx.medicines}</p>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {rx.instructions}
                    </p>
                  </li>
                ))}
              </ul>
              <Link
                to="/doctor/prescriptions"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-light hover:underline"
              >
                View all →
              </Link>
            </>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-text-secondary/20 bg-background/50 px-6 py-10 text-center">
              <p className="text-text-secondary">
                No recent prescriptions
              </p>
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
        <div className="mt-4 h-64 lg:h-72">
          <ResponsiveContainer width="100%" height="100%">
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
                  typeof name === 'string' ? name.charAt(0).toUpperCase() + name.slice(1) : String(name),
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
