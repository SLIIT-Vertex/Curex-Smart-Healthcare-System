import api from './axiosInstance'
import type {
  AppointmentRecord,
  BookAppointmentPayload,
  DoctorDirectoryItem,
} from '../types/appointment'

export interface DoctorBackendResponse {
  id: string
  firstName: string
  lastName: string
  specialization: string
  email?: string
  phone?: string
  consultationFee?: number
  bio?: string
  avatarUrl?: string
  verified?: boolean
}

export interface UserDoctorResponse {
  id: string
  firstName: string
  lastName: string
  email: string
  specialization?: string
  phone?: string
  bio?: string
}

export interface AvailabilitySlotResponse {
  id: string
  doctorId: string
  day: string
  startTime: string
  endTime: string
  booked: boolean
}

/** Fetch doctors from doctor-service, with fallback to user-service admin endpoint */
export async function getDoctorDirectory(specialty?: string): Promise<DoctorDirectoryItem[]> {
  // First try the doctor-service API
  try {
    console.log('Fetching doctors from /api/doctors/search...')
    const params = specialty ? { specialty } : {}
    const { data } = await api.get<DoctorBackendResponse[]>('/api/doctors/search', { params })
    console.log('Doctors response from doctor-service:', data)
    
    if (Array.isArray(data) && data.length > 0) {
      const doctors = data.map((doc) => ({
        id: doc.id,
        name: `Dr. ${doc.firstName} ${doc.lastName}`.trim(),
        specialty: doc.specialization || 'General',
        hospital: 'Curex Health Network',
      }))
      console.log(`Successfully fetched ${doctors.length} doctors from doctor-service`)
      return doctors
    }
  } catch (error: any) {
    console.warn('Failed to fetch doctors from doctor-service:', {
      message: error?.message,
      status: error?.response?.status,
      url: error?.config?.url,
    })
  }

  // Fallback to user-service admin endpoint
  try {
    console.log('Fallback: Fetching doctors from /api/admin/users/by-role/DOCTOR...')
    const { data } = await api.get<UserDoctorResponse[]>('/api/admin/users/by-role/DOCTOR')
    console.log('Doctors response from user-service:', data)
    
    if (Array.isArray(data) && data.length > 0) {
      const doctors = data.map((user) => ({
        id: user.id,
        name: `Dr. ${user.firstName} ${user.lastName}`.trim(),
        specialty: user.specialization || 'General',
        hospital: 'Curex Health Network',
      }))
      console.log(`Successfully fetched ${doctors.length} doctors from user-service admin endpoint`)
      return doctors
    }
  } catch (error: any) {
    console.error('Failed to fetch doctors from user-service admin endpoint:', {
      message: error?.message,
      status: error?.response?.status,
      url: error?.config?.url,
      data: error?.response?.data,
    })
  }

  // If both fail, return empty
  console.error('Failed to fetch doctors from both doctor-service and user-service')
  return []
}

export async function getDoctorSlots(doctorId: string): Promise<AvailabilitySlotResponse[]> {
  try {
    console.log(`Fetching slots for doctor ${doctorId} from /api/doctors/${doctorId}/availability`)
    const { data } = await api.get<AvailabilitySlotResponse[]>(
      `/api/doctors/${doctorId}/availability`
    )
    console.log(`Slots response for doctor ${doctorId}:`, data)
    
    if (!Array.isArray(data)) {
      console.error('Unexpected response format from slots API:', data)
      return []
    }
    
    return data
  } catch (error: any) {
    console.error(`Failed to fetch slots for doctor ${doctorId}:`, {
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    })
    return []
  }
}

/** Fetch appointments for a specific doctor from appointment service */
export async function getDoctorAppointments(doctorId: string): Promise<AppointmentRecord[]> {
  try {
    console.log(`Fetching appointments for doctor ${doctorId}`)
    const { data } = await api.get<AppointmentRecord[]>(
      `/api/appointments/doctor/${doctorId}`
    )
    console.log(`Appointments for doctor ${doctorId}:`, data)
    return Array.isArray(data) ? data : []
  } catch (error: any) {
    console.error(`Failed to fetch appointments for doctor ${doctorId}:`, {
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    })
    return []
  }
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
