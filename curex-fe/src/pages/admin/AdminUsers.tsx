import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, ChevronLeft, ChevronRight, MoreVertical, ShieldOff, ShieldCheck } from 'lucide-react'
import { adminService } from '../../services/adminService'
import { useToast } from '../../store/hooks'
import type { AccountStatus, Role, UserResponse } from '../../types/auth'

const ROLE_LABELS: Record<Role, string> = { PATIENT: 'Patient', DOCTOR: 'Doctor', ADMIN: 'Admin' }
const STATUS_LABELS: Record<AccountStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Active',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
}
const STATUS_CLASSES: Record<AccountStatus, string> = {
  PENDING: 'bg-status-attention/15 text-status-attention',
  APPROVED: 'bg-status-healthy/15 text-primary',
  REJECTED: 'bg-error/15 text-error',
  SUSPENDED: 'bg-text-secondary/15 text-text-secondary',
}

function StatusBadge({ status }: { status: AccountStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

function RoleBadge({ role }: { role: Role }) {
  const cls =
    role === 'ADMIN'
      ? 'bg-primary/10 text-primary'
      : role === 'DOCTOR'
        ? 'bg-accent-sky/20 text-primary'
        : 'bg-accent-mint/20 text-primary'
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>
      {ROLE_LABELS[role]}
    </span>
  )
}

interface ActionMenuProps {
  user: UserResponse
  onAction: (userId: string, action: 'APPROVE' | 'REJECT' | 'SUSPEND' | 'REACTIVATE') => void
}

function ActionMenu({ user, onAction }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const actions: { label: string; value: 'APPROVE' | 'REJECT' | 'SUSPEND' | 'REACTIVATE'; show: boolean }[] = (
    [
      { label: 'Approve',    value: 'APPROVE'    as const, show: user.accountStatus === 'PENDING'   || user.accountStatus === 'REJECTED'  },
      { label: 'Reject',     value: 'REJECT'     as const, show: user.accountStatus === 'PENDING'   || user.accountStatus === 'APPROVED'  },
      { label: 'Suspend',    value: 'SUSPEND'    as const, show: user.accountStatus === 'APPROVED'                                        },
      { label: 'Reactivate', value: 'REACTIVATE' as const, show: user.accountStatus === 'SUSPENDED' || user.accountStatus === 'REJECTED'  },
    ] as const
  ).filter((a) => a.show)

  if (actions.length === 0) return null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="User actions"
        className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-primary-light/5 hover:text-primary"
      >
        <MoreVertical className="h-4 w-4" strokeWidth={1.5} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 min-w-[9rem] rounded-xl border border-text-secondary/10 bg-surface py-1 shadow-card">
          {actions.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              className={`flex w-full items-center gap-2 px-3.5 py-2 text-sm transition-colors hover:bg-primary-light/5 ${value === 'REJECT' || value === 'SUSPEND' ? 'text-error' : 'text-primary'}`}
              onClick={() => { onAction(user.id, value); setOpen(false) }}
            >
              {value === 'APPROVE' || value === 'REACTIVATE' ? (
                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
              ) : (
                <ShieldOff className="h-3.5 w-3.5" strokeWidth={1.75} />
              )}
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function AdminUsers() {
  const { toast } = useToast()
  const [users, setUsers] = useState<UserResponse[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchUsers = useCallback(() => {
    setIsLoading(true)
    adminService
      .getUsers({
        page,
        size: 10,
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      })
      .then((data) => {
        setUsers(data.users)
        setTotalPages(data.totalPages)
        setTotalItems(data.totalItems)
      })
      .catch(() => toast('Failed to load users.', 'error'))
      .finally(() => setIsLoading(false))
  }, [page, search, roleFilter, statusFilter, toast])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  // Reset page when filters change
  useEffect(() => { setPage(0) }, [search, roleFilter, statusFilter])

  async function handleAction(userId: string, action: 'APPROVE' | 'REJECT' | 'SUSPEND' | 'REACTIVATE') {
    setActionLoading(userId)
    try {
      await adminService.updateUserStatus(userId, { action })
      toast(
        action === 'APPROVE' ? 'User approved.' : action === 'REJECT' ? 'User rejected.' : action === 'SUSPEND' ? 'User suspended.' : 'User reactivated.',
        action === 'APPROVE' || action === 'REACTIVATE' ? 'success' : 'warning',
      )
      fetchUsers()
    } catch {
      toast('Action failed. Please try again.', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-primary">User Management</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {totalItems} users registered on the platform
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" strokeWidth={1.5} />
          <input
            type="search"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-text-secondary/20 bg-surface py-2.5 pl-10 pr-4 text-sm text-primary placeholder:text-text-secondary focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-xl border border-text-secondary/20 bg-surface px-3 py-2.5 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
        >
          <option value="">All roles</option>
          <option value="PATIENT">Patient</option>
          <option value="DOCTOR">Doctor</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-text-secondary/20 bg-surface px-3 py-2.5 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Active</option>
          <option value="REJECTED">Rejected</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-surface" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-text-secondary/10">
                {['Name', 'Email', 'Role', 'Status', 'Joined', ''].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-text-secondary"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-text-secondary/10 last:border-0">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-5 py-3.5">
                        <div className="h-4 animate-pulse rounded bg-text-secondary/10" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-sm text-text-secondary">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className={`border-b border-text-secondary/10 last:border-0 transition-colors hover:bg-background/40 ${actionLoading === user.id ? 'opacity-50' : ''}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light/10 text-xs font-semibold text-primary">
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <span className="font-medium text-primary">
                          {user.firstName} {user.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary">{user.email}</td>
                    <td className="px-5 py-3.5"><RoleBadge role={user.role} /></td>
                    <td className="px-5 py-3.5"><StatusBadge status={user.accountStatus} /></td>
                    <td className="px-5 py-3.5 text-text-secondary">
                      {new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <ActionMenu user={user} onAction={handleAction} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-text-secondary/10 px-5 py-3">
            <p className="text-xs text-text-secondary">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-primary-light/5 hover:text-primary disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-primary-light/5 hover:text-primary disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
