import { Brain } from 'lucide-react'

const MAX_CHARS = 2000

interface SymptomInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  loading?: boolean
}

export function SymptomInput({
  value,
  onChange,
  onSubmit,
  loading = false,
}: SymptomInputProps) {
  const charsRemaining = MAX_CHARS - value.length
  const isOverLimit = charsRemaining < 0

  return (
    <div className="space-y-4">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_CHARS))}
        placeholder="Describe your symptoms in detail…"
        rows={4}
        disabled={loading}
        className="symptom-input"
        aria-label="Describe your symptoms"
        aria-describedby="symptom-char-count"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span
          id="symptom-char-count"
          className={`text-xs ${isOverLimit ? 'text-error' : 'text-text-secondary'}`}
        >
          {value.length} / {MAX_CHARS} characters
        </span>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading || !value.trim()}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-surface border-t-transparent" />
              Analyzing…
            </>
          ) : (
            <>
              <Brain className="h-4 w-4" strokeWidth={1.5} />
              Check Symptoms
            </>
          )}
        </button>
      </div>
    </div>
  )
}
