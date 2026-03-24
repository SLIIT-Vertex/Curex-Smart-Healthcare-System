import { useState } from 'react'
import { Pencil, Check, ShieldCheck, ShieldAlert } from 'lucide-react'
import type { Doctor } from '../../types/doctor'
import '../../styles/pages/DoctorDashboard.css'

const INPUT_CLASS =
  'w-full rounded-xl border border-text-secondary/20 bg-surface px-4 py-2.5 text-sm text-primary placeholder:text-text-secondary focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20'

/*  Mock data  */

const MOCK_DOCTOR: Doctor = {
  id: 'd1',
  name: 'Dr. Maria Silva',
  email: 'maria.silva@curex.health',
  specialty: 'Cardiologist',
  phone: '+94 77 123 4567',
  bio: 'Board-certified cardiologist with over 15 years of experience in preventive and interventional cardiology. Passionate about patient education and holistic heart health.',
  avatarUrl: undefined,
  isVerified: true,
  createdAt: '2024-01-15T00:00:00',
  qualifications: ['MBBS', 'MD Cardiology', 'FRCP (UK)'],
  hospitalAffiliation: 'National Hospital of Sri Lanka',
}

export function DoctorProfile() {
  const [isEditing, setIsEditing] = useState(false)
  const [profile, setProfile] = useState<Doctor>(MOCK_DOCTOR)
  const [draft, setDraft] = useState<Doctor>(MOCK_DOCTOR)

  const handleEdit = () => {
    setDraft({ ...profile })
    setIsEditing(true)
  }

  const handleCancel = () => {
    setDraft({ ...profile })
    setIsEditing(false)
  }

  const handleSave = () => {
    setProfile({ ...draft })
    setIsEditing(false)
  }

  const updateDraft = <K extends keyof Doctor>(key: K, value: Doctor[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const addQualification = () => {
    setDraft((prev) => ({
      ...prev,
      qualifications: [...(prev.qualifications ?? []), ''],
    }))
  }

  const updateQualification = (index: number, value: string) => {
    setDraft((prev) => {
      const q = [...(prev.qualifications ?? [])]
      q[index] = value
      return { ...prev, qualifications: q }
    })
  }

  const removeQualification = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      qualifications: (prev.qualifications ?? []).filter((_, i) => i !== index),
    }))
  }

  const display = isEditing ? draft : profile
  const initials = profile.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="section-heading">Profile</h1>
        {!isEditing ? (
          <button type="button" onClick={handleEdit} className="btn-secondary">
            <Pencil className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Edit profile
          </button>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Left: Avatar + quick stats */}
        <div
          className="rounded-2xl bg-surface p-6"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <div className="flex flex-col items-center text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-light/20 text-2xl font-bold text-primary">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <h2 className="mt-4 text-lg font-semibold text-primary">
              {display.name}
            </h2>
            <p className="text-sm text-text-secondary">{display.specialty}</p>
            <p className="mt-1 text-sm text-text-secondary">{display.email}</p>

            {/* Verification badge */}
            <div
              className={`mt-4 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                display.isVerified
                  ? 'border-accent-mint/40 bg-accent-mint/10 text-primary'
                  : 'border-accent-peach/40 bg-accent-peach/10 text-primary'
              }`}
            >
              {display.isVerified ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Verified
                </>
              ) : (
                <>
                  <ShieldAlert className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Pending verification
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Form fields */}
        <div
          className="space-y-6 rounded-2xl bg-surface p-6"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          {/* About / Bio */}
          <div>
            <label className="block text-sm font-medium text-primary">
              About
            </label>
            {isEditing ? (
              <textarea
                value={draft.bio ?? ''}
                onChange={(e) => updateDraft('bio', e.target.value)}
                rows={4}
                placeholder="Tell patients about your background and approach..."
                className={`mt-1.5 ${INPUT_CLASS} resize-y`}
              />
            ) : (
              <p className="mt-1.5 text-sm text-text-secondary">
                {display.bio || 'No bio added yet.'}
              </p>
            )}
          </div>

          {/* Qualifications */}
          <div>
            <label className="block text-sm font-medium text-primary">
              Qualifications
            </label>
            {isEditing ? (
              <div className="mt-2 space-y-2">
                {(draft.qualifications ?? []).map((q, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={q}
                      onChange={(e) => updateQualification(i, e.target.value)}
                      placeholder="e.g. MBBS, MD"
                      className={INPUT_CLASS}
                    />
                    <button
                      type="button"
                      onClick={() => removeQualification(i)}
                      className="rounded-lg border border-error/30 px-3 text-sm font-medium text-error transition hover:bg-error/10"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addQualification}
                  className="btn-secondary text-sm"
                >
                  + Add qualification
                </button>
              </div>
            ) : (
              <ul className="mt-1.5 list-inside list-disc text-sm text-text-secondary">
                {(display.qualifications ?? []).length > 0 ? (
                  (display.qualifications ?? []).map((q, i) => (
                    <li key={i}>{q}</li>
                  ))
                ) : (
                  <li>No qualifications listed.</li>
                )}
              </ul>
            )}
          </div>

          {/* Contact info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-primary">
                Phone
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={draft.phone ?? ''}
                  onChange={(e) => updateDraft('phone', e.target.value)}
                  placeholder="+94 77 123 4567"
                  className={`mt-1.5 ${INPUT_CLASS}`}
                />
              ) : (
                <p className="mt-1.5 text-sm text-text-secondary">
                  {display.phone || '—'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-primary">
                Hospital affiliation
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={draft.hospitalAffiliation ?? ''}
                  onChange={(e) =>
                    updateDraft('hospitalAffiliation', e.target.value)
                  }
                  placeholder="Hospital name"
                  className={`mt-1.5 ${INPUT_CLASS}`}
                />
              ) : (
                <p className="mt-1.5 text-sm text-text-secondary">
                  {display.hospitalAffiliation || '—'}
                </p>
              )}
            </div>
          </div>

          {/* Edit mode: name, email, specialty (read-only email often) */}
          {isEditing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-primary">
                  Full name
                </label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => updateDraft('name', e.target.value)}
                  className={`mt-1.5 ${INPUT_CLASS}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary">
                  Specialty
                </label>
                <input
                  type="text"
                  value={draft.specialty}
                  onChange={(e) => updateDraft('specialty', e.target.value)}
                  placeholder="e.g. Cardiologist"
                  className={`mt-1.5 ${INPUT_CLASS}`}
                />
              </div>
            </div>
          )}

          {/* Save / Cancel */}
          {isEditing && (
            <div className="flex flex-wrap gap-3 border-t border-text-secondary/10 pt-6">
              <button type="button" onClick={handleSave} className="btn-primary">
                <Check className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Save
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
