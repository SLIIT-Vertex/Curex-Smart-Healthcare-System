import axios from 'axios'
import api from './axiosInstance'
import type {
  PatientProfile,
  MedicalHistory,
  PatientPrescription,
} from '../types/patient.ts'
import type { UserInfo } from '../types/auth'

/** Use mock data when backend is unavailable (e.g. during development). */
const USE_MOCK_ON_ERROR = true

/*  Mock data (fallback when API unreachable)  */

const MOCK_PROFILE: PatientProfile = {
  id: 'p1',
  name: 'Emma Tin',
  email: 'emma@example.com',
  phone: '+94 77 456 7890',
  dateOfBirth: '1996-05-12',
  gender: 'FEMALE',
  bloodType: 'O+',
  address: 'Colombo 03',
  createdAt: '2024-01-15T10:00:00Z',
  medicalHistory: {
    conditions: ['Diabetes (Type 2)'],
    allergies: ['Penicillin'],
    pastSurgeries: [],
  },
  emergencyContact: {
    name: 'John Tin',
    relationship: 'Spouse',
    phone: '+94 77 111 2222',
  },
}

const MOCK_MEDICAL_HISTORY: MedicalHistory = {
  conditions: ['Diabetes (Type 2)'],
  allergies: ['Penicillin'],
  pastSurgeries: [],
}

/*  API functions  */

export async function createPatientProfile(
  user: UserInfo
): Promise<PatientProfile> {
  const { data } = await api.post<PatientProfile>('/api/patients', {
    userId: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phoneNumber ?? '',
  })
  return data
}

/**
 * Resolves the patient-service profile for a given user ID.
 * If no profile exists yet (404), one is auto-created so pages that depend on
 * a patient-service record (prescriptions, reports) work like appointments.
 */
export async function getPatientByUserId(
  userId: string,
  user?: UserInfo
): Promise<{ id: string; name: string; email: string }> {
  try {
    const { data } = await api.get<PatientProfile>(
      `/api/patients/by-user/${userId}`
    )
    return { id: data.id, name: data.name, email: data.email }
  } catch (err) {
    const is404 =
      axios.isAxiosError(err) && err.response?.status === 404

    if (is404 && user) {
      const created = await createPatientProfile(user)
      return { id: created.id, name: created.name, email: created.email }
    }
    throw err
  }
}

export async function getProfile(patientId: string): Promise<PatientProfile> {
  try {
    const { data } = await api.get<PatientProfile>(
      `/api/patients/${patientId}`
    )
    return data
  } catch (err) {
    if (USE_MOCK_ON_ERROR) {
      return { ...MOCK_PROFILE, id: patientId }
    }
    throw err
  }
}

export async function updateProfile(
  patientId: string,
  data: Partial<PatientProfile>
): Promise<PatientProfile> {
  try {
    const { data: updated } = await api.put<PatientProfile>(
      `/api/patients/${patientId}`,
      data
    )
    return updated
  } catch (err) {
    if (USE_MOCK_ON_ERROR) {
      return { ...MOCK_PROFILE, ...data, id: patientId } as PatientProfile
    }
    throw err
  }
}

export async function getMedicalHistory(
  patientId: string
): Promise<MedicalHistory> {
  try {
    const { data } = await api.get<MedicalHistory>(
      `/api/patients/${patientId}/history`
    )
    return data
  } catch (err) {
    if (USE_MOCK_ON_ERROR) {
      return MOCK_MEDICAL_HISTORY
    }
    throw err
  }
}

export async function getPrescriptions(
  patientId: string
): Promise<PatientPrescription[]> {

  const { data } = await api.get<PatientPrescription[]>(
    `/api/patients/${patientId}/prescriptions`
  )
  return data
}
