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
  patientId: string
  appointmentId: string
  medicines: string
  instructions: string
  issuedAt: string
  status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
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
  ageGroup: string
  bloodType: string
  allergies: string[]
  knownConditions: string[]
  lastCheckup?: string
}
