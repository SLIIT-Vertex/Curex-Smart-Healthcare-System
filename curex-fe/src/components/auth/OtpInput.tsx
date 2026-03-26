import { useRef, useCallback, type KeyboardEvent, type ChangeEvent } from 'react'

/**
 * A 6-cell OTP entry grid with auto-advance and backspace focus management.
 *
 * Uses `data-index` attributes on cells so `onKeyDown` and `onChange` handlers
 * can be stable `useCallback` references (no inline arrow functions in JSX).
 *
 * @param value    Current 6-character OTP string (spaces for empty cells).
 * @param onChange Called with the updated string on each keystroke.
 * @param label    Descriptive label shown above the grid.
 * @param testId   Base `data-testid` prefix; each cell gets `{testId}-{i}`.
 */
export const OtpInput = ({
  value,
  onChange,
  label,
  testId,
}: {
  value: string
  onChange: (v: string) => void
  label: string
  testId: string
}) => {
  const refsArray = useRef<Array<HTMLInputElement | null>>(Array(6).fill(null))

  const handleCellKey = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    const i = Number(e.currentTarget.dataset.index)
    if (e.key === 'Backspace' && !e.currentTarget.value && i > 0) {
      refsArray.current[i - 1]?.focus()
    }
  }, [])

  const handleCellChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const i     = Number(e.currentTarget.dataset.index)
    const digit = e.target.value.replace(/\D/g, '').slice(-1)
    const arr   = value.padEnd(6, ' ').split('')
    arr[i]      = digit || ' '
    onChange(arr.join('').trimEnd())
    if (digit && i < 5) refsArray.current[i + 1]?.focus()
  }, [value, onChange])

  return (
    <div>
      <p className="text-sm font-semibold text-primary mb-2">{label}</p>
      <div className="otp-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <input
            key={i}
            ref={el => { refsArray.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={(value[i] ?? '').trim()}
            data-index={i}
            onChange={handleCellChange}
            onKeyDown={handleCellKey}
            className={`otp-cell ${value[i]?.trim() ? 'filled' : ''}`}
            data-testid={`${testId}-${i}`}
          />
        ))}
      </div>
    </div>
  )
}
