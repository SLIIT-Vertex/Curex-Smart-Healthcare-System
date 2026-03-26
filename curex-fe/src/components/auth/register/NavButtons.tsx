import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useRegisterNavigation } from '../../../hooks/useRegisterNavigation'

/**
 * Back + Next navigation row, zero-param.
 * Reads `nextLabel` from the navigation hook so step-5 shows "Skip & continue"
 * while the phone is unverified.
 */
export const NavButtons = () => {
  const { next, back, nextLabel } = useRegisterNavigation()

  return (
    <div className="flex gap-3 mt-1">
      <button
        type="button"
        onClick={back}
        className="btn-secondary flex items-center gap-2 py-3 px-5"
        data-testid="register-back-button"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={next}
        className="btn-primary flex-1 justify-center gap-2.5 py-3"
        data-testid="register-next-button"
      >
        {nextLabel} <ArrowRight className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  )
}
