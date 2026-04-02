import api from './axiosInstance'

export interface IssuePrescriptionPayload {
  doctorId: string
  patientId: string
  appointmentId: string
  patientEmail?: string
  patientName?: string
  diagnosis?: string
  medicines: string
  instructions?: string
  validFrom: string
  validTo: string
}

export interface PrescriptionResponse {
  id: string
  doctorId: string
  doctorName?: string
  doctorSpecialty?: string
  patientId: string
  patientName?: string
  appointmentId?: string
  diagnosis?: string
  medicines: string
  instructions?: string
  validFrom: string
  validTo: string
  status: string
  issuedAt: string
}

export async function issuePrescription(
  payload: IssuePrescriptionPayload
): Promise<PrescriptionResponse> {
  const { data } = await api.post<PrescriptionResponse>(
    '/api/prescriptions',
    payload
  )
  return data
}

export async function getPrescriptionsByDoctor(
  doctorId: string
): Promise<PrescriptionResponse[]> {
  const { data } = await api.get<PrescriptionResponse[]>(
    `/api/prescriptions/doctor/${doctorId}`
  )
  return data
}

export async function updatePrescriptionStatus(
  prescriptionId: string,
  status: string
): Promise<PrescriptionResponse> {
  const { data } = await api.patch<PrescriptionResponse>(
    `/api/prescriptions/${prescriptionId}/status`,
    { status }
  )
  return data
}
