export interface Patient {
  id: string
  name: string
  email: string
  phone?: string
  dateOfBirth?: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  bloodType?: string
  address?: string
  avatarUrl?: string
  createdAt: string
}

export interface MedicalHistory {
  conditions: string[]
  allergies: string[]
  pastSurgeries: string[]
}

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
}

export interface PatientProfile extends Patient {
  medicalHistory?: MedicalHistory
  emergencyContact?: EmergencyContact
}

export interface PatientPrescription {
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
  status?: 'PENDING' | 'ACTIVE' | 'ISSUED' | 'COMPLETED' | 'CANCELLED'
}

export interface ConsultationRecord {
  id: string
  doctorId: string
  doctorName: string
  doctorSpecialty?: string
  date: string
  visitType: string
  healthStatus: 'GOOD' | 'FAIR' | 'CRITICAL'
  healthScore?: number
  reportId?: string
  /** Whether a prescription exists for this visit. */
  prescriptionIssued: boolean
  /**
   * When `prescriptionIssued` is true, used to deep-link prescriptions
   * (`?appointment=`). Should match `prescription.appointmentId`.
   */
  appointmentId?: string
}

export interface ProgressDataPoint {
  consultation: string
  score: number
}

export interface SymptomCheckRequest {
  symptoms: string
}

export interface SymptomCheckResponse {
  conditions: string[]
  specialty: string
  urgency: 'low' | 'medium' | 'high'
  summary?: string
  possibleCauses?: string[]
  selfCareTips?: string[]
  whenToSeekCare?: string
  emergencyWarning?: string | null
}

export interface PatientDashboardData {
  upcomingAppointments: number
  totalPrescriptions: number
  totalReports: number
  progressData: ProgressDataPoint[]
  recentConsultations: ConsultationRecord[]
}

export interface MedicalDetailsSnapshot {
  age: string | null
  bloodGroup: string | null
  gender: string | null
  allergies: string[]
  chronicConditions: string[]
}
