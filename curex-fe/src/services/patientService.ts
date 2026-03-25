import api from './axiosInstance'
import type {
  PatientProfile,
  MedicalHistory,
  PatientPrescription,
} from '../types/patient.ts'

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

const MOCK_PRESCRIPTIONS: PatientPrescription[] = [
  {
    id: 'rx1',
    doctorId: 'd1',
    doctorName: 'Dr. Silva',
    patientId: 'p1',
    appointmentId: 'apt1',
    medicines: 'Paracetamol 500mg, Vitamin D3',
    instructions: 'Take twice daily with food. Vitamin D once in the morning.',
    issuedAt: '2026-03-22T10:00:00Z',
    status: 'ACTIVE',
  },
  {
    id: 'rx2',
    doctorId: 'd2',
    doctorName: 'Dr. Khan',
    patientId: 'p1',
    appointmentId: 'apt2',
    medicines: 'Amoxicillin 500mg',
    instructions: 'Take three times daily for 7 days. Complete full course.',
    issuedAt: '2026-03-18T14:30:00Z',
    status: 'ACTIVE',
  },
  {
    id: 'rx3',
    doctorId: 'd3',
    doctorName: 'Dr. Perera',
    patientId: 'p1',
    appointmentId: 'apt3',
    medicines: 'Ibuprofen 400mg',
    instructions: 'Take as needed for pain, max 3 per day.',
    issuedAt: '2026-03-10T09:00:00Z',
    status: 'COMPLETED',
  },
]

/*  API functions  */

export async function getPatientByUserId(
  userId: string
): Promise<{ id: string; name: string; email: string }> {
  const { data } = await api.get<PatientProfile>(
    `/api/patients/by-user/${userId}`
  )
  return { id: data.id, name: data.name, email: data.email }
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
  try {
    const { data } = await api.get<PatientPrescription[]>(
      `/api/patients/${patientId}/prescriptions`
    )
    return data
  } catch (err) {
    if (USE_MOCK_ON_ERROR) {
      return MOCK_PRESCRIPTIONS.filter((p) => p.patientId === patientId)
    }
    throw err
  }
}
