import api from './axiosInstance'
import type { SymptomCheckResponse } from '../types/patient'

/** Use mock data when backend is unavailable (e.g. during development). */
const USE_MOCK_ON_ERROR = false

/** Delay before retry on transient 5xx (ms). */
const RETRY_DELAY_MS = 1000

/*  Mock response (fallback when API unreachable)  */

function getMockSymptomResponse(symptoms: string): SymptomCheckResponse {
  const lower = symptoms.toLowerCase()
  if (
    lower.includes('headache') ||
    lower.includes('dizziness') ||
    lower.includes('migraine')
  ) {
    return {
      conditions: ['Tension headache', 'Migraine', 'Vertigo (BPPV)'],
      specialty: 'Neurologist',
      urgency: 'medium',
    }
  }
  if (lower.includes('fever') || lower.includes('cough') || lower.includes('cold')) {
    return {
      conditions: ['Common cold', 'Flu (Influenza)', 'Upper respiratory infection'],
      specialty: 'General Practitioner',
      urgency: 'low',
    }
  }
  if (lower.includes('chest') || lower.includes('heart') || lower.includes('pain')) {
    return {
      conditions: ['Angina', 'GERD', 'Musculoskeletal strain'],
      specialty: 'Cardiologist',
      urgency: 'high',
    }
  }
  return {
    conditions: ['General consultation recommended'],
    specialty: 'General Practitioner',
    urgency: 'low',
  }
}

/*  API functions  */

/**
 * Check if the AI symptom service is available.
 * Call on page load to show "AI available" status.
 */
export async function checkAiHealth(): Promise<boolean> {
  try {
    const { status } = await api.get('/api/ai/health')
    return status >= 200 && status < 300
  } catch {
    return false
  }
}

/** Sleep for retry delay. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Submit symptoms to AI symptom checker and get suggested conditions,
 * recommended specialty, and urgency level.
 * Retries once on transient 5xx.
 */
export async function checkSymptoms(
  symptoms: string
): Promise<SymptomCheckResponse> {
  const attempt = async (): Promise<SymptomCheckResponse> => {
    const { data } = await api.post<SymptomCheckResponse>(
      '/api/ai/symptoms/check',
      { symptoms }
    )
    return data
  }

  try {
    return await attempt()
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    const isRetryable5xx = status != null && status >= 500 && status < 600

    if (isRetryable5xx) {
      await sleep(RETRY_DELAY_MS)
      try {
        return await attempt()
      } catch (retryErr) {
        if (USE_MOCK_ON_ERROR) {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(getMockSymptomResponse(symptoms))
            }, 800)
          })
        }
        throw retryErr
      }
    }

    if (USE_MOCK_ON_ERROR) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(getMockSymptomResponse(symptoms))
        }, 800)
      })
    }
    throw err
  }
}
