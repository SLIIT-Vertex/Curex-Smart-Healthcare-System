import { useState, useCallback, type ChangeEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/**
 * Password text field with an inline show/hide toggle.
 * Visibility state is local (not worth persisting to Redux).
 */
export const PasswordInput = ({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
}) => {
  const [show, setShow] = useState(false)

  const toggle       = useCallback(() => setShow(v => !v), [])
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
    [onChange],
  )

  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="auth-input pr-11"
        data-testid={`register-${id}-input`}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary transition-colors"
        data-testid={`register-${id}-toggle`}
      >
        {show
          ? <EyeOff className="h-4 w-4" strokeWidth={1.5} />
          : <Eye    className="h-4 w-4" strokeWidth={1.5} />
        }
      </button>
    </div>
  )
}
