import { useCallback, useEffect, useState } from 'react'
import {
  UserCheck,
  UserX,
  Stethoscope,
  RefreshCw,
  CalendarDays,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { adminService } from '../../services/adminService'
import { useToast } from '../../store/hooks'
import type { UserResponse } from '../../types/auth'

interface ConfirmDialogProps {
  user: UserResponse
  action: 'APPROVE' | 'REJECT'
  onConfirm: (notes: string) => void
  onCancel: () => void
  isLoading: boolean
}

function ConfirmDialog({ user, action, onConfirm, onCancel, isLoading }: ConfirmDialogProps) {
  const [notes, setNotes] = useState('')
  const isApprove = action === 'APPROVE'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/30 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${isApprove ? 'Approve' : 'Reject'} doctor account`}
    >
      <div className="w-full max-w-md rounded-2xl bg-surface p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isApprove ? 'bg-status-healthy/15' : 'bg-error/15'}`}
          >
            {isApprove ? (
              <CheckCircle2 className="h-5 w-5 text-status-healthy" strokeWidth={1.75} />
            ) : (
              <XCircle className="h-5 w-5 text-error" strokeWidth={1.75} />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-primary">
              {isApprove ? 'Approve' : 'Reject'} doctor account
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              {user.firstName} {user.lastName} — {user.email}
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm text-text-secondary">
          {isApprove
            ? 'The doctor will be notified and can start accepting patient appointments.'
            : 'The doctor will be notified that their application was not accepted.'}
        </p>

        <div className="mt-4">
          <label htmlFor="approval-notes" className="text-sm font-medium text-primary">
            Notes <span className="font-normal text-text-secondary">(optional)</span>
          </label>
          <textarea
            id="approval-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              isApprove
                ? 'e.g. Credentials verified successfully'
                : 'e.g. Incomplete licence documentation'
            }
            rows={3}
            className="mt-1.5 w-full resize-none rounded-xl border border-text-secondary/20 bg-background px-4 py-3 text-sm text-primary placeholder:text-text-secondary focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
          />
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="btn-secondary flex-1 justify-center py-2.5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(notes)}
            disabled={isLoading}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-surface transition disabled:opacity-60 ${
              isApprove
                ? 'bg-status-healthy hover:brightness-95'
                : 'bg-error hover:brightness-95'
            }`}
          >
            {isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-surface/30 border-t-surface" />
            ) : isApprove ? (
              <UserCheck className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <UserX className="h-4 w-4" strokeWidth={1.75} />
            )}
            {isLoading ? 'Processing…' : isApprove ? 'Approve' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface DoctorCardProps {
  doctor: UserResponse
  onApprove: (doctor: UserResponse) => void
  onReject: (doctor: UserResponse) => void
}

function DoctorCard({ doctor, onApprove, onReject }: DoctorCardProps) {
  return (
    <div
      className="rounded-2xl bg-surface p-5 transition-shadow hover:shadow-md"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-sky/15 text-sm font-bold text-primary">
            {doctor.firstName[0]}{doctor.lastName[0]}
          </div>
          <div>
            <p className="font-semibold text-primary">
              Dr. {doctor.firstName} {doctor.lastName}
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-status-attention/15 px-2 py-0.5 text-xs font-medium text-status-attention">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-attention" />
              Pending Review
            </span>
          </div>
        </div>
      </div>

      {/* Details */}
      <dl className="mt-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          <dd>{doctor.email}</dd>
        </div>
        {doctor.phoneNumber && (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Phone className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
            <dd>{doctor.phoneNumber}</dd>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Stethoscope className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          <dd>Doctor registration</dd>
        </div>
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          <dd>
            Applied{' '}
            {new Date(doctor.createdAt).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </dd>
        </div>
      </dl>

      {/* Actions */}
      <div className="mt-5 flex gap-2.5">
        <button
          type="button"
          onClick={() => onReject(doctor)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-error/30 bg-error/5 px-3 py-2.5 text-sm font-medium text-error transition hover:bg-error/10"
        >
          <UserX className="h-4 w-4" strokeWidth={1.75} />
          Reject
        </button>
        <button
          type="button"
          onClick={() => onApprove(doctor)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-status-healthy px-3 py-2.5 text-sm font-semibold text-primary transition hover:brightness-95"
        >
          <UserCheck className="h-4 w-4" strokeWidth={1.75} />
          Approve
        </button>
      </div>
    </div>
  )
}

export function AdminDoctorApproval() {
  const { toast } = useToast()
  const [doctors, setDoctors] = useState<UserResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<{
    doctor: UserResponse
    action: 'APPROVE' | 'REJECT'
  } | null>(null)
  const [isActing, setIsActing] = useState(false)

  const fetchDoctors = useCallback(
    (silent = false) => {
      if (!silent) setIsLoading(true)
      else setIsRefreshing(true)

      adminService
        .getPendingDoctors()
        .then(setDoctors)
        .catch(() => toast('Failed to load pending doctors.', 'error'))
        .finally(() => {
          setIsLoading(false)
          setIsRefreshing(false)
        })
    },
    [toast],
  )

  useEffect(() => { fetchDoctors() }, [fetchDoctors])

  async function handleConfirm(notes: string) {
    if (!confirmTarget) return
    setIsActing(true)
    try {
      await adminService.updateUserStatus(confirmTarget.doctor.id, {
        action: confirmTarget.action,
        notes: notes || undefined,
      })
      const isApprove = confirmTarget.action === 'APPROVE'
      toast(
        isApprove
          ? `Dr. ${confirmTarget.doctor.firstName} ${confirmTarget.doctor.lastName} has been approved.`
          : `Dr. ${confirmTarget.doctor.firstName} ${confirmTarget.doctor.lastName}'s application was rejected.`,
        isApprove ? 'success' : 'warning',
      )
      setConfirmTarget(null)
      fetchDoctors(true)
    } catch {
      toast('Action failed. Please try again.', 'error')
    } finally {
      setIsActing(false)
    }
  }

  return (
    <>
      {confirmTarget && (
        <ConfirmDialog
          user={confirmTarget.doctor}
          action={confirmTarget.action}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmTarget(null)}
          isLoading={isActing}
        />
      )}

      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-primary">Doctor Approval</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {doctors.length} application{doctors.length !== 1 ? 's' : ''} waiting for review
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchDoctors(true)}
            disabled={isRefreshing}
            aria-label="Refresh list"
            className="btn-secondary flex items-center gap-1.5 py-2 text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} strokeWidth={1.75} />
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-60 animate-pulse rounded-2xl bg-text-secondary/10" />
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-text-secondary/20 bg-surface px-8 py-20 text-center">
            <UserCheck className="h-10 w-10 text-status-healthy" strokeWidth={1.25} />
            <p className="mt-3 text-base font-medium text-primary">All caught up!</p>
            <p className="mt-1 max-w-xs text-sm text-text-secondary">
              There are no pending doctor applications to review right now.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {doctors.map((doctor) => (
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
                onApprove={(d) => setConfirmTarget({ doctor: d, action: 'APPROVE' })}
                onReject={(d) => setConfirmTarget({ doctor: d, action: 'REJECT' })}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
