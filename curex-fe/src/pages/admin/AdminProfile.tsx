import { useState } from 'react'
import {
  Pencil,
  Check,
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  BadgeCheck,
} from 'lucide-react'
import { useAuth } from '../../store/hooks'
import type { UserInfo } from '../../types/auth'

const INPUT_CLASS =
  'w-full rounded-xl border border-text-secondary/20 bg-surface px-4 py-2.5 text-sm text-primary placeholder:text-text-secondary focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20'

export function AdminProfile() {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<Partial<UserInfo>>({})

  const handleEdit = () => {
    setDraft({
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? '',
      phoneNumber: user?.phoneNumber ?? '',
    })
    setIsEditing(true)
  }

  const handleCancel = () => {
    setDraft({})
    setIsEditing(false)
  }

  const handleSave = () => {
    // TODO: call API to update admin profile
    setIsEditing(false)
  }

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'A'

  const displayName = user ? `${user.firstName} ${user.lastName}` : 'Admin'

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
            Profile
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your admin account settings
          </p>
        </div>
        {!isEditing && (
          <button type="button" onClick={handleEdit} className="btn-secondary">
            <Pencil className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Edit profile
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Left: Avatar card */}
        <div
          className="overflow-hidden rounded-2xl bg-surface"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          {/* Gradient accent header */}
          <div
            className="h-24"
            style={{
              background:
                'linear-gradient(135deg, #1C274C 0%, #3A4F8A 60%, #6EE7B7 100%)',
            }}
          />
          <div className="flex flex-col items-center px-6 pb-6 -mt-12">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-surface bg-primary text-2xl font-bold text-surface shadow-md">
              {initials}
            </div>
            <h2 className="mt-4 text-lg font-semibold text-primary">
              {displayName}
            </h2>
            <p className="text-sm text-text-secondary">{user?.email ?? '—'}</p>

            {/* Role badge */}
            <div className="mt-3 flex items-center gap-1.5 rounded-full border border-accent-violet/40 bg-accent-violet/10 px-3 py-1.5 text-xs font-medium text-primary">
              <Shield className="h-3.5 w-3.5" strokeWidth={1.5} />
              Administrator
            </div>

            {/* Account status */}
            <div className="mt-2 flex items-center gap-1.5 rounded-full border border-accent-mint/40 bg-accent-mint/10 px-3 py-1.5 text-xs font-medium text-primary">
              <BadgeCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
              {user?.accountStatus ?? 'Active'}
            </div>
          </div>
        </div>

        {/* Right: Info sections */}
        <div className="space-y-6">
          {/* Personal Information */}
          <div
            className="rounded-2xl bg-surface p-6"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-light/10">
                <User className="h-4 w-4 text-primary-light" strokeWidth={1.5} />
              </div>
              <h3 className="text-sm font-semibold text-primary">
                Personal Information
              </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-secondary">
                  First Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={draft.firstName ?? ''}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                    className={`mt-1.5 ${INPUT_CLASS}`}
                  />
                ) : (
                  <p className="mt-1.5 text-sm font-medium text-primary">
                    {user?.firstName ?? '—'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Last Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={draft.lastName ?? ''}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, lastName: e.target.value }))
                    }
                    className={`mt-1.5 ${INPUT_CLASS}`}
                  />
                ) : (
                  <p className="mt-1.5 text-sm font-medium text-primary">
                    {user?.lastName ?? '—'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div
            className="rounded-2xl bg-surface p-6"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-sky/15">
                <Mail className="h-4 w-4 text-accent-sky" strokeWidth={1.5} />
              </div>
              <h3 className="text-sm font-semibold text-primary">
                Contact Information
              </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Email
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={draft.email ?? ''}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, email: e.target.value }))
                    }
                    className={`mt-1.5 ${INPUT_CLASS}`}
                  />
                ) : (
                  <div className="mt-1.5 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-text-secondary" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-primary">
                      {user?.email ?? '—'}
                    </p>
                    {user?.emailVerified && (
                      <span className="rounded-full bg-accent-mint/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        Verified
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Phone
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={draft.phoneNumber ?? ''}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        phoneNumber: e.target.value,
                      }))
                    }
                    placeholder="+94 77 123 4567"
                    className={`mt-1.5 ${INPUT_CLASS}`}
                  />
                ) : (
                  <div className="mt-1.5 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-text-secondary" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-primary">
                      {user?.phoneNumber || '—'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div
            className="rounded-2xl bg-surface p-6"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-peach/15">
                <Calendar className="h-4 w-4 text-accent-peach" strokeWidth={1.5} />
              </div>
              <h3 className="text-sm font-semibold text-primary">
                Account Details
              </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Account ID
                </label>
                <p className="mt-1.5 font-mono text-xs text-text-secondary">
                  {user?.id ?? '—'}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Member Since
                </label>
                <p className="mt-1.5 text-sm font-medium text-primary">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : '—'}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Role
                </label>
                <p className="mt-1.5 text-sm font-medium text-primary">
                  {user?.role ?? '—'}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Account Status
                </label>
                <p className="mt-1.5 text-sm font-medium text-primary">
                  {user?.accountStatus ?? '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Save / Cancel for edit mode */}
          {isEditing && (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSave}
                className="btn-primary"
              >
                <Check className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Save changes
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
