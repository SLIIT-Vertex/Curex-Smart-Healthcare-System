import { useState, useEffect } from 'react'
import {
  Pencil,
  Check,
  User,
  Heart,
  AlertTriangle,
  Phone,
  Calendar,
  Droplets,
  MapPin,
} from 'lucide-react'
import { useAuth } from '../../store/hooks'
import { getProfile, updateProfile } from '../../services/patientService'
import type {
  PatientProfile,
  MedicalHistory,
  EmergencyContact,
} from '../../types/patient'

const INPUT_CLASS = 'patient-page-input'

/*  Mock patient ID (replace with auth when M1 ready)  */
const MOCK_PATIENT_ID = 'p1'

const EMPTY_MEDICAL_HISTORY: MedicalHistory = {
  conditions: [],
  allergies: [],
  pastSurgeries: [],
}

const EMPTY_EMERGENCY_CONTACT: EmergencyContact = {
  name: '',
  relationship: '',
  phone: '',
}

export function PatientProfile() {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [draft, setDraft] = useState<PatientProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await getProfile(MOCK_PATIENT_ID)
        if (!cancelled) {
          setProfile(data)
          setDraft(data)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleEdit = () => {
    if (profile) setDraft({ ...profile })
    setIsEditing(true)
  }

  const handleCancel = () => {
    if (profile) setDraft({ ...profile })
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!draft) return
    setSaving(true)
    try {
      const updated = await updateProfile(MOCK_PATIENT_ID, draft)
      setProfile(updated)
      setDraft(updated)
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const updateDraft = <K extends keyof PatientProfile>(
    key: K,
    value: PatientProfile[K]
  ) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : null))
  }

  const addMedicalItem = (field: keyof MedicalHistory) => {
    setDraft((prev) => {
      if (!prev) return null
      const hist = prev.medicalHistory ?? EMPTY_MEDICAL_HISTORY
      const arr = [...hist[field], '']
      return {
        ...prev,
        medicalHistory: { ...hist, [field]: arr },
      }
    })
  }

  const updateMedicalItem = (
    field: keyof MedicalHistory,
    index: number,
    value: string
  ) => {
    setDraft((prev) => {
      if (!prev) return null
      const hist = prev.medicalHistory ?? EMPTY_MEDICAL_HISTORY
      const arr = [...hist[field]]
      arr[index] = value
      return { ...prev, medicalHistory: { ...hist, [field]: arr } }
    })
  }

  const removeMedicalItem = (field: keyof MedicalHistory, index: number) => {
    setDraft((prev) => {
      if (!prev) return null
      const hist = prev.medicalHistory ?? EMPTY_MEDICAL_HISTORY
      const arr = hist[field].filter((_, i) => i !== index)
      return { ...prev, medicalHistory: { ...hist, [field]: arr } }
    })
  }

  const updateEmergencyContact = <K extends keyof EmergencyContact>(
    key: K,
    value: EmergencyContact[K]
  ) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            emergencyContact: {
              ...(prev.emergencyContact ?? EMPTY_EMERGENCY_CONTACT),
              [key]: value,
            },
          }
        : null
    )
  }

  if (loading || !profile || !draft) {
    return (
      <div className="space-y-6 lg:space-y-8">
        <div className="patient-loading-skeleton h-10 w-48" />
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="patient-card p-6">
            <div className="patient-loading-skeleton mx-auto h-24 w-24 rounded-full" />
            <div className="patient-loading-skeleton mt-4 h-6 w-32" />
            <div className="patient-loading-skeleton mt-2 h-4 w-40" />
          </div>
          <div className="patient-card p-6 space-y-6">
            <div className="patient-loading-skeleton h-5 w-32" />
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="patient-loading-skeleton h-10" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const display = isEditing ? draft : profile
  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : profile.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()

  const medicalHistory = display.medicalHistory ?? EMPTY_MEDICAL_HISTORY
  const emergencyContact = display.emergencyContact ?? EMPTY_EMERGENCY_CONTACT
  const draftHistory = draft.medicalHistory ?? EMPTY_MEDICAL_HISTORY
  const draftEmergency = draft.emergencyContact ?? EMPTY_EMERGENCY_CONTACT

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-heading">Profile</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your personal and medical information
          </p>
        </div>
        {!isEditing ? (
          <button type="button" onClick={handleEdit} className="btn-secondary">
            <Pencil className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Edit profile
          </button>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Left: Avatar + quick info */}
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
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-surface bg-primary-light/20 text-2xl font-bold text-primary shadow-md">
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
            <p className="text-sm text-text-secondary">{display.email}</p>
            <p className="mt-1 text-sm text-text-secondary">
              {display.phone || '—'}
            </p>
          </div>
        </div>

        {/* Right: Form sections */}
        <div className="space-y-6">
          {/* Personal Details */}
          <div
            className="rounded-2xl bg-surface p-6"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-light/10">
                <User
                  className="h-4 w-4 text-primary-light"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="text-sm font-semibold text-primary">
                Personal Details
              </h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Date of birth
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    value={draft.dateOfBirth ?? ''}
                    onChange={(e) =>
                      updateDraft('dateOfBirth', e.target.value || undefined)
                    }
                    className={`mt-1.5 ${INPUT_CLASS}`}
                  />
                ) : (
                  <div className="mt-1.5 flex items-center gap-2">
                    <Calendar
                      className="h-4 w-4 text-text-secondary"
                      strokeWidth={1.5}
                    />
                    <p className="text-sm font-medium text-primary">
                      {display.dateOfBirth || '—'}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Gender
                </label>
                {isEditing ? (
                  <select
                    value={draft.gender ?? ''}
                    onChange={(e) =>
                      updateDraft(
                        'gender',
                        (e.target.value || undefined) as
                          | 'MALE'
                          | 'FEMALE'
                          | 'OTHER'
                          | undefined
                      )
                    }
                    className={`mt-1.5 ${INPUT_CLASS}`}
                  >
                    <option value="">—</option>
                    <option value="FEMALE">Female</option>
                    <option value="MALE">Male</option>
                    <option value="OTHER">Other</option>
                  </select>
                ) : (
                  <p className="mt-1.5 text-sm font-medium text-primary">
                    {display.gender === 'FEMALE'
                      ? 'Female'
                      : display.gender === 'MALE'
                        ? 'Male'
                        : display.gender === 'OTHER'
                          ? 'Other'
                          : '—'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Blood type
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={draft.bloodType ?? ''}
                    onChange={(e) =>
                      updateDraft('bloodType', e.target.value || undefined)
                    }
                    placeholder="e.g. O+"
                    className={`mt-1.5 ${INPUT_CLASS}`}
                  />
                ) : (
                  <div className="mt-1.5 flex items-center gap-2">
                    <Droplets
                      className="h-4 w-4 text-text-secondary"
                      strokeWidth={1.5}
                    />
                    <p className="text-sm font-medium text-primary">
                      {display.bloodType || '—'}
                    </p>
                  </div>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Address
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={draft.address ?? ''}
                    onChange={(e) =>
                      updateDraft('address', e.target.value || undefined)
                    }
                    placeholder="Full address"
                    className={`mt-1.5 ${INPUT_CLASS}`}
                  />
                ) : (
                  <div className="mt-1.5 flex items-center gap-2">
                    <MapPin
                      className="h-4 w-4 text-text-secondary"
                      strokeWidth={1.5}
                    />
                    <p className="text-sm font-medium text-primary">
                      {display.address || '—'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Medical History */}
          <div
            className="rounded-2xl bg-surface p-6"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-peach/15">
                <Heart
                  className="h-4 w-4 text-accent-peach"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="text-sm font-semibold text-primary">
                Medical History
              </h3>
            </div>
            {isEditing ? (
              <div className="space-y-4">
                <EditableList
                  label="Known conditions"
                  items={draftHistory.conditions}
                  onAdd={() => addMedicalItem('conditions')}
                  onUpdate={(i, v) => updateMedicalItem('conditions', i, v)}
                  onRemove={(i) => removeMedicalItem('conditions', i)}
                  placeholder="e.g. Diabetes (Type 2)"
                />
                <EditableList
                  label="Allergies"
                  items={draftHistory.allergies}
                  onAdd={() => addMedicalItem('allergies')}
                  onUpdate={(i, v) => updateMedicalItem('allergies', i, v)}
                  onRemove={(i) => removeMedicalItem('allergies', i)}
                  placeholder="e.g. Penicillin"
                />
                <EditableList
                  label="Past surgeries"
                  items={draftHistory.pastSurgeries}
                  onAdd={() => addMedicalItem('pastSurgeries')}
                  onUpdate={(i, v) => updateMedicalItem('pastSurgeries', i, v)}
                  onRemove={(i) => removeMedicalItem('pastSurgeries', i)}
                  placeholder="e.g. Appendectomy 2020"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <ReadOnlyBadgeList
                  label="Known conditions"
                  items={medicalHistory.conditions}
                  color="bg-error/10 border-error/20 text-primary"
                />
                <ReadOnlyBadgeList
                  label="Allergies"
                  items={medicalHistory.allergies}
                  color="bg-accent-peach/10 border-accent-peach/30 text-primary"
                />
                <ReadOnlyBadgeList
                  label="Past surgeries"
                  items={medicalHistory.pastSurgeries}
                  color="bg-accent-sky/10 border-accent-sky/30 text-primary"
                />
              </div>
            )}
          </div>

          {/* Emergency Contact */}
          <div
            className="rounded-2xl bg-surface p-6"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-error/10">
                <AlertTriangle
                  className="h-4 w-4 text-error"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="text-sm font-semibold text-primary">
                Emergency Contact
              </h3>
            </div>
            {isEditing ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-text-secondary">
                    Name
                  </label>
                  <input
                    type="text"
                    value={draftEmergency.name}
                    onChange={(e) =>
                      updateEmergencyContact('name', e.target.value)
                    }
                    placeholder="Full name"
                    className={`mt-1.5 ${INPUT_CLASS}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-text-secondary">
                    Relationship
                  </label>
                  <input
                    type="text"
                    value={draftEmergency.relationship}
                    onChange={(e) =>
                      updateEmergencyContact('relationship', e.target.value)
                    }
                    placeholder="e.g. Spouse"
                    className={`mt-1.5 ${INPUT_CLASS}`}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium uppercase tracking-wider text-text-secondary">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={draftEmergency.phone}
                    onChange={(e) =>
                      updateEmergencyContact('phone', e.target.value)
                    }
                    placeholder="+94 77 111 2222"
                    className={`mt-1.5 ${INPUT_CLASS}`}
                  />
                </div>
              </div>
            ) : (
              <div className="text-sm text-primary">
                {emergencyContact.name || emergencyContact.phone ? (
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background">
                      <Phone
                        className="h-4 w-4 text-text-secondary"
                        strokeWidth={1.5}
                      />
                    </div>
                    <div>
                      <p className="font-medium">
                        {emergencyContact.name}
                        {emergencyContact.relationship && (
                          <span className="text-text-secondary">
                            {' '}
                            · {emergencyContact.relationship}
                          </span>
                        )}
                      </p>
                      {emergencyContact.phone && (
                        <p className="mt-0.5 text-text-secondary">
                          {emergencyContact.phone}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-text-secondary">
                    No emergency contact listed.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Edit mode: name, email */}
          {isEditing && (
            <div
              className="rounded-2xl bg-surface p-6"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              <div className="flex items-center gap-2 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-violet/15">
                  <Pencil
                    className="h-4 w-4 text-accent-violet"
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="text-sm font-semibold text-primary">
                  Basic Information
                </h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-text-secondary">
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
                  <label className="block text-xs font-medium uppercase tracking-wider text-text-secondary">
                    Email
                  </label>
                  <input
                    type="email"
                    value={draft.email}
                    onChange={(e) => updateDraft('email', e.target.value)}
                    className={`mt-1.5 ${INPUT_CLASS}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-text-secondary">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={draft.phone ?? ''}
                    onChange={(e) =>
                      updateDraft('phone', e.target.value || undefined)
                    }
                    placeholder="+94 77 456 7890"
                    className={`mt-1.5 ${INPUT_CLASS}`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Save / Cancel */}
          {isEditing && (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
              >
                <Check className="mr-2 h-4 w-4" strokeWidth={1.5} />
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
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

/*  Editable list (add/remove items)  */

function EditableList({
  label,
  items,
  onAdd,
  onUpdate,
  onRemove,
  placeholder,
}: {
  label: string
  items: string[]
  onAdd: () => void
  onUpdate: (index: number, value: string) => void
  onRemove: (index: number) => void
  placeholder: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wider text-text-secondary">
        {label}
      </label>
      <div className="mt-2 space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) => onUpdate(i, e.target.value)}
              placeholder={placeholder}
              className={INPUT_CLASS}
            />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="shrink-0 rounded-lg border border-error/30 px-3 text-sm font-medium text-error transition hover:bg-error/10"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={onAdd}
          className="btn-secondary text-sm"
        >
          + Add
        </button>
      </div>
    </div>
  )
}

function ReadOnlyBadgeList({
  label,
  items,
  color,
}: {
  label: string
  items: string[]
  color: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wider text-text-secondary">
        {label}
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.length > 0 ? (
          items.map((item, i) => (
            <span
              key={i}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${color}`}
            >
              {item}
            </span>
          ))
        ) : (
          <span className="text-sm text-text-secondary">None</span>
        )}
      </div>
    </div>
  )
}
