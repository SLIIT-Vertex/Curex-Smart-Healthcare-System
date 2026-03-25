import { useCallback, type ChangeEvent } from 'react'
import { Calendar, MapPin } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { setField } from '../../../store/slices/registerSlice'
import { Field } from '../Field'
import { NavButtons } from './NavButtons'

/** Step 2 — personal details (name, DOB, gender, address). Zero-param: reads and writes Redux. */
export const PersonalStep = () => {
  const dispatch = useAppDispatch()
  const form     = useAppSelector(s => s.register)
  const errors   = form.errors

  /**
   * Single memoised handler for all text/select inputs.
   * Reads the Redux field key from the element's `data-field` attribute.
   */
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const key = e.target.dataset.field
      if (!key) return
      dispatch(setField({ key: key as keyof typeof form, value: e.target.value }))
    },
    [dispatch, form],
  )

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Personal details</h1>
        <p className="mt-1.5 text-sm text-text-secondary">Tell us a little about yourself.</p>
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
            data-field="dob"
            onChange={handleChange}
            className="auth-input"
            data-testid="register-dob-input"
          />
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
