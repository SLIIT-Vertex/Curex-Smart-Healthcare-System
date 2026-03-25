export interface Doctor {
  id: string
  name: string
  email: string
  specialty: string
  phone?: string
  bio?: string
  avatarUrl?: string
  isVerified: boolean
  createdAt: string
  /** Optional extensions for profile (qualifications, hospital) */
  qualifications?: string[]
  hospitalAffiliation?: string
}

export interface AvailabilitySlot {
  id: string
  doctorId: string
  day:
    | 'MONDAY'
    | 'TUESDAY'
    | 'WEDNESDAY'
    | 'THURSDAY'
    | 'FRIDAY'
    | 'SATURDAY'
    | 'SUNDAY'
  startTime: string // "09:00"
  endTime: string // "09:30"
  isBooked: boolean
}

export type PrescriptionStatus =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ISSUED'
  | 'PENDING'

export interface Prescription {
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
  validFrom?: string
  validTo?: string
  issuedAt: string
  status?: PrescriptionStatus
}

export interface MedicineLine {
  name: string
  dosage: string
  frequency: string
  duration: string
}

export interface Appointment {
  id: string
  patientId: string
  doctorId: string
  appointmentTime: string
  status:
    | 'PENDING'
    | 'CONFIRMED'
    | 'IN_SESSION'
    | 'COMPLETED'
    | 'CANCELLED'
  type: 'IN_PERSON' | 'TELEMEDICINE'
  sessionUrl?: string
  patientName?: string
}

export interface WeeklyAppointmentCounts {
  day: string
  confirmed: number
  pending: number
  completed: number
}

export interface DashboardStats {
  todayAppointments: number
  pendingPrescriptions: number
  totalPatients: number
  availableSlots: number
  weeklyAppointments: WeeklyAppointmentCounts[]
}
