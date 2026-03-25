import { useState } from 'react'
import { Brain, ChevronDown, ChevronUp } from 'lucide-react'

const MAX_CHARS = 2000

const QUICK_PROMPTS = [
  'Headache',
  'Cough & fever',
  'Stomach pain',
  'Chest discomfort',
] as const

const DURATION_OPTIONS = [
  { value: '', label: 'Select duration' },
  { value: '< 1 day', label: '< 1 day' },
  { value: '1–3 days', label: '1–3 days' },
  { value: '4–7 days', label: '4–7 days' },
  { value: '1–2 weeks', label: '1–2 weeks' },
  { value: '> 2 weeks', label: '> 2 weeks' },
] as const

const SEVERITY_OPTIONS = [
  { value: '', label: 'Select severity' },
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
] as const

const ONSET_OPTIONS = [
  { value: '', label: 'Select onset' },
  { value: 'sudden', label: 'Sudden' },
  { value: 'gradual', label: 'Gradual' },
] as const

const EXAMPLE_PROMPTS = [
  "I've had a throbbing headache for 2 days, worse in the morning, with nausea and light sensitivity.",
  "Cough, fever, and fatigue for 3 days. Started with a sore throat.",
  "Stomach pain and nausea after eating. Started gradually over the past week.",
] as const

const PLACEHOLDER =
  "E.g. I've had a throbbing headache for 2 days, worse in the morning, with nausea and light sensitivity."

export interface StructuredContext {
  duration: string
  severity: string
  onset: string
}

interface SymptomInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  loading?: boolean
  minLength?: number
  /** Optional structured context; when provided, "Add more context" section is shown. */
  structured?: StructuredContext
  onStructuredChange?: (ctx: StructuredContext) => void
}

export function SymptomInput({
  value,
  onChange,
  onSubmit,
  loading = false,
  minLength = 3,
  structured = { duration: '', severity: '', onset: '' },
  onStructuredChange,
}: SymptomInputProps) {
  const [contextExpanded, setContextExpanded] = useState(false)
  const charsRemaining = MAX_CHARS - value.length
  const isOverLimit = charsRemaining < 0
  const isApproachingLimit = charsRemaining >= 0 && charsRemaining <= 200
  const trimmedLen = value.trim().length
  const canSubmit = trimmedLen >= minLength && !isOverLimit

  const appendToText = (text: string) => {
    const sep = value.trim() ? ' ' : ''
    const next = (value + sep + text).slice(0, MAX_CHARS)
    onChange(next)
  }

  const applyExample = (example: string) => {
    onChange(example.slice(0, MAX_CHARS))
  }

  return (
    <div className="space-y-4">
      {/* Quick prompts */}
      <div className="flex flex-wrap gap-2">
        <span className="sr-only">Quick prompts:</span>
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => appendToText(prompt)}
            disabled={loading}
            className="rounded-full border border-primary-light/40 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_CHARS))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && canSubmit && !loading) {
            e.preventDefault()
            onSubmit()
          }
        }}
        placeholder={PLACEHOLDER}
        rows={4}
        disabled={loading}
        className="symptom-input"
        aria-label="Describe your symptoms"
        aria-describedby={
          trimmedLen > 0 && trimmedLen < minLength
            ? 'symptom-char-count symptom-min-hint'
            : 'symptom-char-count'
        }
        aria-invalid={trimmedLen > 0 && trimmedLen < minLength}
      />

      {trimmedLen > 0 && trimmedLen < minLength && (
        <p id="symptom-min-hint" className="text-xs text-text-secondary">
          Enter at least {minLength} characters to analyze.
        </p>
      )}

      {/* Optional structured fields */}
      {onStructuredChange && (
        <div className="rounded-xl border border-text-secondary/15 bg-background/50">
          <button
            type="button"
            onClick={() => setContextExpanded((e) => !e)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-primary hover:bg-background/80"
            aria-expanded={contextExpanded}
          >
            Add more context
            {contextExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {contextExpanded && (
            <div className="flex flex-wrap gap-4 border-t border-text-secondary/10 p-4">
              <label className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-xs text-text-secondary">Duration</span>
                <select
                  value={structured.duration}
                  onChange={(e) =>
                    onStructuredChange({
                      ...structured,
                      duration: e.target.value,
                    })
                  }
                  disabled={loading}
                  className="patient-page-select"
                >
                  {DURATION_OPTIONS.map((opt) => (
                    <option key={opt.value || 'empty'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-xs text-text-secondary">Severity</span>
                <select
                  value={structured.severity}
                  onChange={(e) =>
                    onStructuredChange({
                      ...structured,
                      severity: e.target.value,
                    })
                  }
                  disabled={loading}
                  className="patient-page-select"
                >
                  {SEVERITY_OPTIONS.map((opt) => (
                    <option key={opt.value || 'empty'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-xs text-text-secondary">Onset</span>
                <select
                  value={structured.onset}
                  onChange={(e) =>
                    onStructuredChange({
                      ...structured,
                      onset: e.target.value,
                    })
                  }
                  disabled={loading}
                  className="patient-page-select"
                >
                  {ONSET_OPTIONS.map((opt) => (
                    <option key={opt.value || 'empty'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>
      )}

      {/* Example prompts */}
      <details className="group">
        <summary className="cursor-pointer text-xs text-text-secondary hover:text-primary">
          Example prompts (click to expand)
        </summary>
        <ul className="mt-2 space-y-1.5">
          {EXAMPLE_PROMPTS.map((example, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => applyExample(example)}
                disabled={loading}
                className="block w-full rounded-lg border border-text-secondary/10 bg-surface/50 px-3 py-2 text-left text-xs text-primary transition-colors hover:border-primary-light/30 hover:bg-surface disabled:opacity-50"
              >
                {example}
              </button>
            </li>
          ))}
        </ul>
      </details>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span
          id="symptom-char-count"
          className={`text-xs ${
            isOverLimit
              ? 'text-error font-medium'
              : isApproachingLimit
                ? 'text-accent-peach font-medium'
                : 'text-text-secondary'
          }`}
          aria-live="polite"
          role="status"
        >
          {value.length} / {MAX_CHARS} characters
          {isApproachingLimit && !isOverLimit && ' (approaching limit)'}
          {isOverLimit && ' — over limit'}
        </span>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading || !canSubmit}
          className="btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
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
