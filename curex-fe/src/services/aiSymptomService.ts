import api from './axiosInstance'
import type { SymptomCheckResponse } from '../types/patient'

/** Use mock data when backend is unavailable (e.g. during development). */
const USE_MOCK_ON_ERROR = false

/* ── Mock response (fallback when API unreachable) ── */

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

/* ── API functions ── */

/**
 * Submit symptoms to AI symptom checker and get suggested conditions,
 * recommended specialty, and urgency level.
 */
export async function checkSymptoms(
  symptoms: string
): Promise<SymptomCheckResponse> {
  try {
    const { data } = await api.post<SymptomCheckResponse>(
      '/api/ai/symptoms/check',
      { symptoms }
    )
    return data
  } catch (err) {
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
