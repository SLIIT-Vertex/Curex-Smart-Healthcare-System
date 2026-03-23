import { useEffect, useState } from 'react'
import {
  Users,
  Stethoscope,
  UserCheck,
  Clock,
  TrendingUp,
  ShieldCheck,
  Database,
  Activity,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { adminService } from '../../services/adminService'
import { useToast } from '../../store/hooks'
import type { PlatformStatistics } from '../../types/auth'

interface StatCardProps {
  label: string
  value: string | number
  icon: typeof Users
  accent: string
  iconBg: string
  sub?: string
}

function StatCard({ label, value, icon: Icon, accent, iconBg, sub }: StatCardProps) {
  return (
    <div className="flex items-start gap-4 rounded-2xl bg-surface p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className={`h-5 w-5 ${accent}`} strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-text-secondary">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold text-primary">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-text-secondary">{sub}</p>}
      </div>
    </div>
  )
}

function HealthBadge({ status }: { status: string }) {
  const isUp = status?.toUpperCase() === 'UP'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isUp
          ? 'bg-status-healthy/20 text-primary'
          : 'bg-error/15 text-error'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isUp ? 'bg-status-healthy' : 'bg-error'}`} />
      {isUp ? 'Healthy' : 'Degraded'}
    </span>
  )
}

export function AdminDashboard() {
  const { toast } = useToast()
  const [stats, setStats] = useState<PlatformStatistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    adminService
      .getStatistics()
      .then(setStats)
      .catch(() => toast('Could not load platform statistics.', 'error'))
      .finally(() => setIsLoading(false))
  }, [toast])

  const us = stats?.userStats
  const chartData = (stats?.registrationTrends ?? []).slice(-14).map((t) => ({
    date: t.date.slice(5),
    registrations: t.registrations,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-primary">Dashboard</h1>
        <p className="mt-1 text-sm text-text-secondary">Platform overview and real-time statistics</p>
      </div>

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-text-secondary/10" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          <StatCard
            label="Total Users"
            value={us?.totalUsers ?? 0}
            icon={Users}
            accent="text-primary-light"
            iconBg="bg-primary-light/10"
          />
          <StatCard
            label="Patients"
            value={us?.totalPatients ?? 0}
            icon={Activity}
            accent="text-status-info"
            iconBg="bg-status-info/15"
          />
          <StatCard
            label="Doctors"
            value={us?.totalDoctors ?? 0}
            icon={Stethoscope}
            accent="text-status-healthy"
            iconBg="bg-status-healthy/15"
          />
          <StatCard
            label="Pending Approval"
            value={us?.pendingDoctors ?? 0}
            icon={Clock}
            accent="text-status-attention"
            iconBg="bg-status-attention/15"
            sub={us && us.pendingDoctors > 0 ? 'Requires action' : 'All clear'}
          />
        </div>
      )}

      {/* Charts + system health row */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Registration trend chart */}
        <div className="rounded-2xl bg-surface p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary-light" strokeWidth={1.75} />
            <h2 className="text-sm font-semibold text-primary">Registration Trend (14 days)</h2>
          </div>
          {isLoading ? (
            <div className="h-48 animate-pulse rounded-xl bg-text-secondary/10" />
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(107 114 128 / 0.1)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid rgb(107 114 128 / 0.15)', borderRadius: 10, fontSize: 12 }}
                  cursor={{ fill: 'rgb(58 79 138 / 0.06)' }}
                />
                <Bar dataKey="registrations" fill="#3A4F8A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-text-secondary">
              No registration data available yet.
            </div>
          )}
        </div>

        {/* System health */}
        <div className="flex flex-col gap-4 rounded-2xl bg-surface p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary-light" strokeWidth={1.75} />
            <h2 className="text-sm font-semibold text-primary">System Health</h2>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 animate-pulse rounded-lg bg-text-secondary/10" />
              ))}
            </div>
          ) : stats?.systemHealth ? (
            <dl className="flex flex-col gap-3">
              {[
                { label: 'API Service', icon: Activity, value: stats.systemHealth.status },
                { label: 'Database', icon: Database, value: stats.systemHealth.databaseStatus },
                { label: 'Messaging', icon: UserCheck, value: stats.systemHealth.messagingStatus },
              ].map(({ label, icon: Icon, value }) => (
                <div key={label} className="flex items-center justify-between rounded-lg border border-text-secondary/10 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-text-secondary" strokeWidth={1.5} />
                    <dt className="text-sm text-text-secondary">{label}</dt>
                  </div>
                  <dd>
                    <HealthBadge status={value ?? 'UNKNOWN'} />
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-text-secondary">Health data unavailable.</p>
          )}

          {/* Doctor approval stats */}
          <div className="mt-auto border-t border-text-secondary/10 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Doctor Accounts
            </p>
            <dl className="flex flex-col gap-1.5 text-sm">
              {[
                { label: 'Approved', value: us?.approvedDoctors ?? '—', cls: 'text-status-healthy' },
                { label: 'Pending', value: us?.pendingDoctors ?? '—', cls: 'text-status-attention' },
                { label: 'Rejected', value: us?.rejectedDoctors ?? '—', cls: 'text-error' },
              ].map(({ label, value, cls }) => (
                <div key={label} className="flex items-center justify-between">
                  <dt className="text-text-secondary">{label}</dt>
                  <dd className={`font-semibold ${cls}`}>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
