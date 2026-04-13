import { useState, useCallback } from 'react'
import {
  Pencil, Check, X, Camera, Loader2,
  User, Mail, Phone, Shield, Calendar, BadgeCheck, MapPin,
} from 'lucide-react'
import { useMyProfile } from '../../hooks/useMyProfile'
import { useProfileImage } from '../../hooks/useProfileImage'
import type { UpdateProfileRequest } from '../../types/auth'

const INPUT = 'w-full rounded-xl border border-text-secondary/20 bg-surface px-4 py-2.5 text-sm text-primary placeholder:text-text-secondary focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20'

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'

export function AdminProfile() {
  const { profile, loading, saving, saveProfile } = useMyProfile()

  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<UpdateProfileRequest>({})

  const startEdit = useCallback(() => {
    if (!profile) return
    setDraft({
      firstName:   profile.firstName,
      lastName:    profile.lastName,
      phoneNumber: profile.phoneNumber ?? '',
      dob:         profile.dob         ?? '',
      gender:      profile.gender       ?? '',
      address:     profile.address      ?? '',
    })
    setIsEditing(true)
  }, [profile])

  const cancelEdit = useCallback(() => {
    setDraft({})
    setIsEditing(false)
  }, [])

  const handleSave = useCallback(async () => {
    const ok = await saveProfile(draft)
    if (ok) setIsEditing(false)
  }, [saveProfile, draft])

  const set = useCallback(<K extends keyof UpdateProfileRequest>(k: K, v: UpdateProfileRequest[K]) => {
    setDraft((prev) => ({ ...prev, [k]: v }))
  }, [])

  // Avatar upload
  const handleImageUploaded = useCallback((url: string) => {
    setDraft((prev) => ({ ...prev, profileImageUrl: url }))
    // Save immediately so other parts of the UI reflect the new avatar
    saveProfile({ profileImageUrl: url })
  }, [saveProfile])

  const { fileInputRef, openPicker, handleFileChange, uploading, accept } =
    useProfileImage(handleImageUploaded)

  if (loading) {
    return (
      <div className="space-y-6 lg:space-y-8">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-text-secondary/10" />
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="rounded-2xl bg-surface p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="mx-auto h-24 w-24 animate-pulse rounded-full bg-text-secondary/10" />
            <div className="mx-auto mt-4 h-5 w-32 animate-pulse rounded bg-text-secondary/10" />
          </div>
          <div className="space-y-4 rounded-2xl bg-surface p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-text-secondary/10" />)}
          </div>
        </div>
      </div>
    )
  }

  const display = profile
  const avatarUrl  = isEditing ? (draft.profileImageUrl ?? profile?.profileImageUrl) : profile?.profileImageUrl
  const initials   = `${profile?.firstName?.[0] ?? ''}${profile?.lastName?.[0] ?? ''}`.toUpperCase() || 'A'
  const displayName = `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() || 'Admin'

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-primary sm:text-3xl">Profile</h1>
          <p className="mt-1 text-sm text-text-secondary">Manage your admin account settings</p>
        </div>
        {!isEditing && (
          <button type="button" onClick={startEdit} className="btn-secondary">
            <Pencil className="mr-2 h-4 w-4" strokeWidth={1.5} /> Edit profile
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* ── Avatar card ── */}
        <div className="overflow-hidden rounded-2xl bg-surface" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="h-24" style={{ background: 'linear-gradient(135deg,#1C274C 0%,#3A4F8A 60%,#6EE7B7 100%)' }} />
          <div className="flex flex-col items-center px-6 pb-6 -mt-12">
            {/* Avatar with upload overlay */}
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-surface bg-primary text-2xl font-bold text-surface shadow-md">
                {avatarUrl
                  ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  : initials
                }
              </div>
              <button
                type="button"
                onClick={openPicker}
                disabled={uploading}
                title="Change photo"
                className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-primary-light text-surface shadow transition hover:bg-primary disabled:opacity-60"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" strokeWidth={2} />}
              </button>
              <input ref={fileInputRef} type="file" accept={accept} className="hidden" onChange={handleFileChange} data-testid="admin-avatar-input" />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-primary">{displayName}</h2>
            <p className="text-sm text-text-secondary">{display?.email ?? '—'}</p>

            <div className="mt-3 flex items-center gap-1.5 rounded-full border border-accent-violet/40 bg-accent-violet/10 px-3 py-1.5 text-xs font-medium text-primary">
              <Shield className="h-3.5 w-3.5" strokeWidth={1.5} /> Administrator
            </div>
            <div className="mt-2 flex items-center gap-1.5 rounded-full border border-accent-mint/40 bg-accent-mint/10 px-3 py-1.5 text-xs font-medium text-primary">
              <BadgeCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
              {display?.accountStatus ?? 'Active'}
            </div>
          </div>
        </div>

        {/* ── Right side ── */}
        <div className="space-y-6">
          {/* Personal Information */}
          <div className="rounded-2xl bg-surface p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
            <SectionHeader icon={<User className="h-4 w-4 text-primary-light" strokeWidth={1.5} />} bg="bg-primary-light/10" title="Personal Information" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First Name">
                {isEditing
                  ? <input type="text" value={draft.firstName ?? ''} onChange={(e) => set('firstName', e.target.value)} className={`mt-1.5 ${INPUT}`} data-testid="admin-first-name" />
                  : <Value>{display?.firstName ?? '—'}</Value>}
              </Field>
              <Field label="Last Name">
                {isEditing
                  ? <input type="text" value={draft.lastName ?? ''} onChange={(e) => set('lastName', e.target.value)} className={`mt-1.5 ${INPUT}`} data-testid="admin-last-name" />
                  : <Value>{display?.lastName ?? '—'}</Value>}
              </Field>
              <Field label="Date of Birth">
                {isEditing
                  ? <input type="date" value={draft.dob ?? ''} onChange={(e) => set('dob', e.target.value || '')} className={`mt-1.5 ${INPUT}`} data-testid="admin-dob" />
                  : <Value icon={<Calendar className="h-4 w-4 text-text-secondary" strokeWidth={1.5} />}>{display?.dob ? fmt(display.dob) : '—'}</Value>}
              </Field>
              <Field label="Gender">
                {isEditing
                  ? (
                    <select value={draft.gender ?? ''} onChange={(e) => set('gender', e.target.value)} className={`mt-1.5 ${INPUT}`} data-testid="admin-gender">
                      <option value="">—</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  )
                  : <Value>{display?.gender ? display.gender[0] + display.gender.slice(1).toLowerCase() : '—'}</Value>}
              </Field>
              <Field label="Address" className="sm:col-span-2">
                {isEditing
                  ? <input type="text" value={draft.address ?? ''} onChange={(e) => set('address', e.target.value)} placeholder="Full address" className={`mt-1.5 ${INPUT}`} data-testid="admin-address" />
                  : <Value icon={<MapPin className="h-4 w-4 text-text-secondary" strokeWidth={1.5} />}>{display?.address ?? '—'}</Value>}
              </Field>
            </div>
          </div>

          {/* Contact Information */}
          <div className="rounded-2xl bg-surface p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
            <SectionHeader icon={<Mail className="h-4 w-4 text-accent-sky" strokeWidth={1.5} />} bg="bg-accent-sky/15" title="Contact Information" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email">
                <div className="mt-1.5 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-text-secondary" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-primary">{display?.email ?? '—'}</p>
                  {display?.emailVerified && (
                    <span className="rounded-full bg-accent-mint/15 px-2 py-0.5 text-[10px] font-semibold text-primary">Verified</span>
                  )}
                </div>
              </Field>
              <Field label="Phone">
                {isEditing
                  ? <input type="tel" value={draft.phoneNumber ?? ''} onChange={(e) => set('phoneNumber', e.target.value)} placeholder="+1 234 567 8900" className={`mt-1.5 ${INPUT}`} data-testid="admin-phone" />
                  : <Value icon={<Phone className="h-4 w-4 text-text-secondary" strokeWidth={1.5} />}>{display?.phoneNumber ?? '—'}</Value>}
              </Field>
            </div>
          </div>

          {/* Account Details (read-only) */}
          <div className="rounded-2xl bg-surface p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
            <SectionHeader icon={<Calendar className="h-4 w-4 text-accent-peach" strokeWidth={1.5} />} bg="bg-accent-peach/15" title="Account Details" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Account ID"><p className="mt-1.5 font-mono text-xs text-text-secondary">{display?.id ?? '—'}</p></Field>
              <Field label="Member Since"><Value>{display?.createdAt ? fmt(display.createdAt) : '—'}</Value></Field>
              <Field label="Role"><Value>{display?.role ?? '—'}</Value></Field>
              <Field label="Status"><Value>{display?.accountStatus ?? '—'}</Value></Field>
            </div>
          </div>

          {/* Save / Cancel */}
          {isEditing && (
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={handleSave} disabled={saving} className="btn-primary" data-testid="admin-save">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" strokeWidth={1.5} />}
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button type="button" onClick={cancelEdit} disabled={saving} className="btn-secondary" data-testid="admin-cancel">
                <X className="mr-2 h-4 w-4" strokeWidth={1.5} /> Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Small helpers ──────────────────────────────────────────────────────── */

function SectionHeader({ icon, bg, title }: { icon: React.ReactNode; bg: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>{icon}</div>
      <h3 className="text-sm font-semibold text-primary">{title}</h3>
    </div>
  )
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium uppercase tracking-wider text-text-secondary">{label}</label>
      {children}
    </div>
  )
}

function Value({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="mt-1.5 flex items-center gap-2">
      {icon}
      <p className="text-sm font-medium text-primary">{children}</p>
    </div>
  )
}
