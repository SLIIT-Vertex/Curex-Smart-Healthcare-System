import axios from 'axios'
import type {
  AppointmentRecord,
  BookAppointmentPayload,
  DoctorDirectoryItem,
} from '../types/appointment'

const APPOINTMENT_BASE_URL =
  import.meta.env.VITE_APPOINTMENT_API_URL ?? 'http://localhost:8088'

const appointmentApi = axios.create({
  baseURL: APPOINTMENT_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

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
  const { data } = await appointmentApi.post<AppointmentRecord>(
    '/api/appointments',
    payload
  )
  return data
}

export async function getAppointmentsByDoctor(
  doctorId: string
): Promise<AppointmentRecord[]> {
  const { data } = await appointmentApi.get<AppointmentRecord[]>(
    `/api/appointments/doctor/${doctorId}`
  )
  return data
}

export async function getAppointmentsByPatient(
  patientId: string
): Promise<AppointmentRecord[]> {
  const { data } = await appointmentApi.get<AppointmentRecord[]>(
    `/api/appointments/patient/${patientId}`
  )
  return data
}
