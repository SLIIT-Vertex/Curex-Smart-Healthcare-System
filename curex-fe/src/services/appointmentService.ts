import api from './axiosInstance'
import type {
  AppointmentRecord,
  BookAppointmentPayload,
  DoctorDirectoryItem,
} from '../types/appointment.ts'

const DOCTOR_DIRECTORY: DoctorDirectoryItem[] = [
  {
    id: 'doc-001',
    name: 'Dr. House',
    specialty: 'Cardiology',
    hospital: 'Curex Central',
  },
  {
    id: 'doc-002',
    name: 'Dr. Perera',
    specialty: 'Dermatology',
    hospital: 'Curex North',
  },
  {
    id: 'doc-003',
    name: 'Dr. Silva',
    specialty: 'Neurology',
    hospital: 'Curex East',
  },
]

export function getDoctorDirectory(): DoctorDirectoryItem[] {
  return DOCTOR_DIRECTORY
}

export async function bookAppointment(
  payload: BookAppointmentPayload
): Promise<AppointmentRecord> {
  const { data } = await api.post<AppointmentRecord>(
    '/api/appointments',
    payload
  )
  return data
}

export async function getAppointmentsByDoctor(
  doctorId: string
): Promise<AppointmentRecord[]> {
  const { data } = await api.get<AppointmentRecord[]>(
    `/api/appointments/doctor/${doctorId}`
  )
  return data
}

export async function getAppointmentsByPatient(
  patientId: string
): Promise<AppointmentRecord[]> {
  const { data } = await api.get<AppointmentRecord[]>(
    `/api/appointments/patient/${patientId}`
  )
  return data
}

export async function getAppointmentById(
  appointmentId: string
): Promise<AppointmentRecord> {
  const { data } = await api.get<AppointmentRecord>(
    `/api/appointments/${appointmentId}`
  )
  return data
}
