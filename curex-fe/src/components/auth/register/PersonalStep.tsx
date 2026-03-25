import { useCallback, type ChangeEvent } from 'react'
import { Calendar, MapPin, Camera, Loader2 } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { setField } from '../../../store/slices/registerSlice'
import { useProfileImage } from '../../../hooks/useProfileImage'
import { Field } from '../Field'
import { NavButtons } from './NavButtons'

/** Step 2 — personal details (name, DOB, gender, address, profile photo). Zero-param: reads and writes Redux. */
export const PersonalStep = () => {
  const dispatch = useAppDispatch()
  const form     = useAppSelector(s => s.register)
  const errors   = form.errors
  const isDoctor = form.role === 'DOCTOR'

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const key = e.target.dataset.field
      if (!key) return
      dispatch(setField({ key: key as keyof typeof form, value: e.target.value }))
    },
    [dispatch, form],
  )

  const handleImageUploaded = useCallback((url: string) => {
    dispatch(setField({ key: 'profileImageUrl', value: url }))
  }, [dispatch])

  const { fileInputRef, openPicker, handleFileChange, uploading, accept } =
    useProfileImage(handleImageUploaded)

  const initials = `${form.firstName?.[0] ?? ''}${form.lastName?.[0] ?? ''}`.toUpperCase() || '?'

  // DOB constraints: patients can't pick future dates; doctors must be ≥ 25 y/o
  const today = new Date()
  const maxDob = (() => {
    if (isDoctor) {
      const d = new Date(today.getFullYear() - 25, today.getMonth(), today.getDate())
      return d.toISOString().slice(0, 10)
    }
    return today.toISOString().slice(0, 10)   // patients: no future dates
  })()

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Personal details</h1>
        <p className="mt-1.5 text-sm text-text-secondary">Tell us a little about yourself.</p>
      </div>

      {/* Profile photo */}
      <div className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
        errors.profileImageUrl
          ? 'border-error/50 bg-error/5'
          : 'border-text-secondary/15 bg-surface'
      }`}>
        <div className="relative flex-shrink-0">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-text-secondary/15 bg-primary-light/10 text-lg font-bold text-primary">
            {form.profileImageUrl
              ? <img src={form.profileImageUrl} alt="" className="h-full w-full object-cover" />
              : initials}
          </div>
          <button
            type="button"
            onClick={openPicker}
            disabled={uploading}
            title="Upload profile photo"
            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-primary-light text-surface shadow transition hover:bg-primary disabled:opacity-60"
            data-testid="signup-avatar-button"
          >
            {uploading
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Camera className="h-3 w-3" strokeWidth={2} />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleFileChange}
            data-testid="signup-avatar-input"
          />
        </div>
        <div>
          <p className="text-sm font-medium text-primary">
            Profile photo
            {isDoctor && (
              <span className="ml-2 rounded-full bg-error/10 px-2 py-0.5 text-[10px] font-semibold text-error">
                Required
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">
            {form.profileImageUrl
              ? 'Photo uploaded ✓'
              : isDoctor
                ? 'A professional headshot is required for doctor accounts'
                : 'Optional — you can add it later too'}
          </p>
          {errors.profileImageUrl && (
            <p className="mt-1 text-xs font-medium text-error">{errors.profileImageUrl}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" error={errors.firstName}>
          <input
            type="text"
            autoComplete="given-name"
            value={form.firstName}
            data-field="firstName"
            onChange={handleChange}
            placeholder="Jane"
            className="auth-input"
            data-testid="register-first-name-input"
          />
        </Field>
        <Field label="Last name" error={errors.lastName}>
          <input
            type="text"
            autoComplete="family-name"
            value={form.lastName}
            data-field="lastName"
            onChange={handleChange}
            placeholder="Smith"
            className="auth-input"
            data-testid="register-last-name-input"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label={<><Calendar className="h-3.5 w-3.5 inline mr-1" />Date of birth</>}
          error={errors.dob}
        >
          <input
            type="date"
            value={form.dob}
            max={maxDob}
            data-field="dob"
            onChange={handleChange}
            className="auth-input"
            data-testid="register-dob-input"
          />
          {isDoctor && (
            <p className="mt-1 text-[11px] text-text-secondary">
              Doctors must be at least 25 years old
            </p>
          )}
        </Field>
        <Field label="Gender" error={errors.gender}>
          <select
            value={form.gender}
            data-field="gender"
            onChange={handleChange}
            className="auth-input"
            data-testid="register-gender-select"
          >
            <option value="">Select…</option>
            <option>Male</option>
            <option>Female</option>
            <option>Non-binary</option>
            <option>Prefer not to say</option>
          </select>
        </Field>
      </div>

      <Field label={<><MapPin className="h-3.5 w-3.5 inline mr-1" />Address <span className="font-normal text-text-secondary">(optional)</span></>}>
        <input
          type="text"
          autoComplete="street-address"
          value={form.address}
          data-field="address"
          onChange={handleChange}
          placeholder="123 Main St, City, Country"
          className="auth-input"
          data-testid="register-address-input"
        />
      </Field>

      <NavButtons />
    </div>
  )
}
