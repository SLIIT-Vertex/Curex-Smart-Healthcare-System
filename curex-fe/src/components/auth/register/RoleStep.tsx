import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { User, Stethoscope, CheckCircle2, ArrowRight } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { setField } from '../../../store/slices/registerSlice'
import { useRegisterNavigation } from '../../../hooks/useRegisterNavigation'

/** Step 1 — role selection (Patient or Doctor). Zero-param: reads and writes Redux. */
export const RoleStep = () => {
  const dispatch = useAppDispatch()
  const role     = useAppSelector(s => s.register.role)
  const { next } = useRegisterNavigation()

  const selectPatient = useCallback(() => {
    dispatch(setField({ key: 'role', value: 'PATIENT' }))
  }, [dispatch])

  const selectDoctor = useCallback(() => {
    dispatch(setField({ key: 'role', value: 'DOCTOR' }))
  }, [dispatch])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Create your account</h1>
        <p className="mt-1.5 text-sm text-text-secondary">
          Already have one?{' '}
          <Link to="/login" className="font-semibold text-primary-light hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-primary">I want to join Curex as a…</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={selectPatient}
            className={`role-card ${role === 'PATIENT' ? 'selected' : 'unselected'}`}
            data-testid="register-role-patient"
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${role === 'PATIENT' ? 'bg-primary-light/15' : 'bg-text-secondary/8'}`}>
              <User className={`h-5 w-5 ${role === 'PATIENT' ? 'text-primary-light' : 'text-text-secondary'}`} strokeWidth={1.5} />
            </div>
            <span className={`text-sm font-bold ${role === 'PATIENT' ? 'text-primary' : 'text-text-secondary'}`}>Patient</span>
            <span className="text-xs leading-relaxed text-text-secondary">
              Book appointments, manage health records, and connect with doctors.
            </span>
            {role === 'PATIENT' && <CheckCircle2 className="h-4 w-4 text-primary-light self-end" strokeWidth={1.75} />}
          </button>

          <button
            type="button"
            onClick={selectDoctor}
            className={`role-card ${role === 'DOCTOR' ? 'selected' : 'unselected'}`}
            data-testid="register-role-doctor"
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${role === 'DOCTOR' ? 'bg-primary-light/15' : 'bg-text-secondary/8'}`}>
              <Stethoscope className={`h-5 w-5 ${role === 'DOCTOR' ? 'text-primary-light' : 'text-text-secondary'}`} strokeWidth={1.5} />
            </div>
            <span className={`text-sm font-bold ${role === 'DOCTOR' ? 'text-primary' : 'text-text-secondary'}`}>Doctor</span>
            <span className="text-xs leading-relaxed text-text-secondary">
              Manage your practice, see patients, and write prescriptions.
            </span>
            {role === 'DOCTOR' && <CheckCircle2 className="h-4 w-4 text-primary-light self-end" strokeWidth={1.75} />}
          </button>
        </div>
      </div>

      {role === 'DOCTOR' && (
        <div className="auth-fade-in rounded-xl bg-accent-peach/12 border border-accent-peach/30 px-4 py-3 text-xs leading-relaxed text-text-secondary">
          Doctor accounts require <strong className="text-primary">admin verification</strong> before you can see patients.
        </div>
      )}

      <button
        type="button"
        onClick={next}
        className="btn-primary w-full justify-center gap-2.5 py-3 text-base"
        data-testid="register-step1-next"
      >
        Continue <ArrowRight className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  )
}
