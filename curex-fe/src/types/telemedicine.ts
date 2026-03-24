export type TelemedicineSessionStatus = 'IN_SESSION' | 'ENDED'

export interface TelemedicineSessionRecord {
  id: string
  appointmentId: string
  patientId: string
  doctorId: string
  roomName: string
  sessionUrl: string
  status: TelemedicineSessionStatus
  startedAt?: string
  endedAt?: string | null
  endedBy?: string | null
  notes?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CreateTelemedicineSessionPayload {
  patientId: string
  doctorId: string
  forceNew?: boolean
}

export interface EndTelemedicineSessionPayload {
  endedBy?: string
  notes?: string
  markAppointmentCompleted?: boolean
}
