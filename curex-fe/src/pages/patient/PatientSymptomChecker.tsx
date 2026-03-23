import { useState } from 'react'
import { checkSymptoms } from '../../services/aiSymptomService'
import aiIllustration from '../../assets/patient/ai.svg'
import { SymptomInput } from '../../components/patient/SymptomInput'
import { SymptomResult } from '../../components/patient/SymptomResult'
import type { SymptomCheckResponse } from '../../types/patient'

export function PatientSymptomChecker() {
  const [symptoms, setSymptoms] = useState('')
  const [result, setResult] = useState<SymptomCheckResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    const trimmed = symptoms.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    try {
      const data = await checkSymptoms(trimmed)
      setResult(data)
    } catch {
      setError('Something went wrong. Please try again.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <div>
        <h1 className="section-heading">AI Symptom Checker</h1>
        <p className="section-subtext mt-1">
          Describe your symptoms and get AI-powered suggestions.
        </p>
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

      {/* Loading skeleton */}
      {loading && (
        <div className="patient-card p-6 lg:p-8">
          <div className="patient-loading-skeleton h-6 w-24" />
          <div className="mt-4 flex gap-2">
            <div className="patient-loading-skeleton h-8 w-32 rounded-full" />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="patient-loading-skeleton h-20" />
            <div className="patient-loading-skeleton h-20" />
            <div className="patient-loading-skeleton h-20" />
          </div>
          <div className="mt-6 patient-loading-skeleton h-4 w-48" />
          <div className="mt-4 patient-loading-skeleton h-10 w-64 rounded-lg" />
        </div>
      )}

      {/* Results */}
      {!loading && result && (
        <section>
          <SymptomResult result={result} />
        </section>
      )}
    </div>
  )
}
