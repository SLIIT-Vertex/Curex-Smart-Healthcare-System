import { Fragment } from 'react'
import { Check } from 'lucide-react'
import { useAppSelector } from '../../store/hooks'
import { RegisterBrandPanel }  from '../../components/auth/RegisterBrandPanel'
import { RoleStep }            from '../../components/auth/register/RoleStep'
import { PersonalStep }        from '../../components/auth/register/PersonalStep'
import { DetailsStep }         from '../../components/auth/register/DetailsStep'
import { ContactStep }         from '../../components/auth/register/ContactStep'
import { SecurityStep }        from '../../components/auth/register/SecurityStep'
import { VerifyStep }          from '../../components/auth/register/VerifyStep'
import { DoctorPendingStep }   from '../../components/auth/register/DoctorPendingStep'

const LOGO_SRC    = '/logo.svg'
const STEP_LABELS = ['Role', 'Personal', 'Details', 'Contact', 'Security', 'Verify']
const TOTAL_STEPS = 6

const STEP_COMPONENTS = [RoleStep, PersonalStep, DetailsStep, ContactStep, SecurityStep, VerifyStep]

/**
 * Multi-step registration wizard.
 *
 * Pure shell — owns the progress stepper and animation container.
 * All form state, validation and step logic live in Redux (registerSlice)
 * and the individual step components.
 *
 * When a DOCTOR completes registration, `form.doctorPending` flips to true
 * and the stepper is swapped for <DoctorPendingStep> — no page navigation.
 */
export const RegisterPage = () => {
  const form    = useAppSelector(s => s.register)
  const step    = form.currentStep
  const animKey = form.animKey
  const animDir = form.animDir

  const animClass  = animDir === 'forward' ? 'auth-step-enter-forward' : 'auth-step-enter-back'
  const ActiveStep = STEP_COMPONENTS[step - 1]

  return (
    <div className="flex min-h-dvh bg-background">
      <RegisterBrandPanel />

      <div className="flex flex-1 flex-col items-center overflow-y-auto">
        {form.doctorPending ? (
          <DoctorPendingStep />
        ) : (
          <div className="my-auto w-full max-w-[440px] px-6 py-10">

            {/* Mobile logo */}
            <a href="/" className="mb-8 flex items-center gap-2.5 no-underline lg:hidden">
              <img src={LOGO_SRC} alt="" className="h-8 w-8" />
              <span className="text-lg font-bold tracking-tight text-primary">Curex</span>
            </a>

            {/* ── Step progress indicator ── */}
            <div className="mb-8">
              <div className="flex items-center">
                {STEP_LABELS.map((label, i) => {
                  const n      = i + 1
                  const state  = n < step ? 'done' : n === step ? 'active' : 'todo'
                  const isLast = i === STEP_LABELS.length - 1
                  return (
                    <Fragment key={label}>
                      <div className="flex flex-col items-center gap-1.5">
                        <div className={`register-step-dot ${state}`}>
                          {state === 'done'
                            ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                            : n
                          }
                        </div>
                        <span className={`hidden sm:block text-[9px] font-medium uppercase tracking-wide transition-colors ${
                          state === 'done'    ? 'text-primary-light'
                          : state === 'active' ? 'text-primary'
                          : 'text-text-secondary/30'
                        }`}>{label}</span>
                      </div>
                      {!isLast && (
                        <div className={`register-step-line ${n < step ? 'done' : 'todo'}`} />
                      )}
                    </Fragment>
                  )
                })}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-base font-semibold text-primary">{STEP_LABELS[step - 1]}</p>
                <span className="rounded-full bg-text-secondary/8 px-2.5 py-0.5 text-[11px] font-medium text-text-secondary">
                  {step} / {TOTAL_STEPS}
                </span>
              </div>
            </div>

            {/* Active step — re-keyed on animKey to trigger CSS animation */}
            <div key={animKey} className={animClass}>
              <ActiveStep />
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
