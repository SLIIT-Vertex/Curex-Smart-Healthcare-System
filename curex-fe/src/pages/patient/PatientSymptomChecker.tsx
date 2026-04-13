import { useState, useEffect } from 'react'
import { checkSymptoms, checkAiHealth } from '../../services/aiSymptomService'
import aiIllustration from '../../assets/patient/ai.svg'
import {
  SymptomInput,
  type StructuredContext,
} from '../../components/patient/SymptomInput'
import { SymptomResult } from '../../components/patient/SymptomResult'
import type { SymptomCheckResponse } from '../../types/patient'
import { isAxiosError } from 'axios'

const MIN_SYMPTOMS_LENGTH = 3

/** Build a single rich symptoms string from free text and optional structured context. */
function buildSymptomsString(
  freeText: string,
  structured: StructuredContext
): string {
  const parts: string[] = [freeText.trim()]
  if (structured.duration) parts.push(`Duration: ${structured.duration}.`)
  if (structured.severity) parts.push(`Severity: ${structured.severity}.`)
  if (structured.onset) parts.push(`Onset: ${structured.onset}.`)
  return parts.join(' ').trim()
}

/** Map backend error status to user-friendly message. */
function getErrorMessage(status: number, detail?: string): string {
  switch (status) {
    case 400:
      return detail ?? 'Please provide at least 3 characters describing your symptoms.'
    case 401:
      return 'Session expired. Please log in again.'
    case 503:
      return 'AI service is temporarily unavailable. Please try again later.'
    default:
      return 'Something went wrong. Please try again.'
  }
}

const INITIAL_STRUCTURED: StructuredContext = {
  duration: '',
  severity: '',
  onset: '',
}

export function PatientSymptomChecker() {
  const [symptoms, setSymptoms] = useState('')
  const [structured, setStructured] = useState<StructuredContext>(INITIAL_STRUCTURED)
  const [result, setResult] = useState<SymptomCheckResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    checkAiHealth().then(setAiAvailable)
  }, [])

  const handleSubmit = async () => {
    const trimmed = symptoms.trim()
    if (!trimmed) return

    if (trimmed.length < MIN_SYMPTOMS_LENGTH) {
      setError('Please provide at least 3 characters describing your symptoms.')
      return
    }

    const symptomsString = buildSymptomsString(trimmed, structured)

    setLoading(true)
    setError(null)
    try {
      const data = await checkSymptoms(symptomsString)
      setResult(data)
    } catch (err) {
      const message = isAxiosError(err)
        ? getErrorMessage(
            err.response?.status ?? 0,
            (err.response?.data as { error?: string })?.error
          )
        : 'Something went wrong. Please try again.'
      setError(message)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <div>
        <h1 className="section-heading">AI Symptom Checker</h1>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p className="section-subtext">
            Describe your symptoms and get AI-powered suggestions.
          </p>
          {aiAvailable !== null && (
            <p
              className="text-xs text-text-secondary shrink-0"
              role="status"
              aria-live="polite"
            >
              {aiAvailable ? (
                <span className="inline-flex items-center gap-1">
                  <span
                    className="inline-block h-2 w-2 rounded-full bg-accent-mint"
                    aria-hidden
                  />
                  AI analysis available
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <span
                    className="inline-block h-2 w-2 rounded-full bg-accent-peach"
                    aria-hidden
                  />
                  AI may be temporarily unavailable; you can still try.
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Symptom Input */}
      <div className="patient-card p-6 lg:p-8">
        <h2 className="text-lg font-semibold text-primary">Symptom Input</h2>
        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-stretch">
          <div className="flex shrink-0 items-center justify-center lg:w-1/2 lg:max-w-xs">
            <img
              src={aiIllustration}
              alt=""
              className="h-48 w-48 object-contain sm:h-56 sm:w-56 lg:h-64 lg:w-64 xl:h-72 xl:w-72"
            />
          </div>
          <div className="min-w-0 flex-1">
            <SymptomInput
              value={symptoms}
              onChange={setSymptoms}
              onSubmit={handleSubmit}
              loading={loading}
              minLength={MIN_SYMPTOMS_LENGTH}
              structured={structured}
              onStructuredChange={setStructured}
            />
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div
          className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Loading skeleton — aligned with SymptomResult layout */}
      {loading && (
        <div className="patient-card p-6 lg:p-8 symptom-result-print">
          <div className="patient-loading-skeleton h-6 w-24" />
          <div className="mt-4 patient-loading-skeleton h-12 w-3/4 max-w-md" />
          <div className="mt-4 flex gap-2">
            <div className="patient-loading-skeleton h-8 w-32 rounded-full" />
          </div>
          <div className="mt-6">
            <div className="patient-loading-skeleton mb-3 h-4 w-36" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="patient-loading-skeleton h-16" />
              <div className="patient-loading-skeleton h-16" />
              <div className="patient-loading-skeleton h-16" />
            </div>
          </div>
          <div className="mt-6">
            <div className="patient-loading-skeleton mb-2 h-4 w-28" />
            <div className="space-y-2">
              <div className="patient-loading-skeleton h-4 w-full" />
              <div className="patient-loading-skeleton h-4 w-4/5" />
              <div className="patient-loading-skeleton h-4 w-3/4" />
            </div>
          </div>
          <div className="mt-6">
            <div className="patient-loading-skeleton mb-2 h-4 w-40" />
            <div className="patient-loading-skeleton h-10 w-full" />
          </div>
          <div className="mt-6 patient-loading-skeleton h-4 w-48" />
          <div className="mt-4 patient-loading-skeleton h-10 w-64 rounded-lg" />
        </div>
      )}

      {/* Results */}
      {!loading && result && (
        <section className="symptom-result-print">
          <SymptomResult result={result} />
        </section>
      )}
    </div>
  )
}
