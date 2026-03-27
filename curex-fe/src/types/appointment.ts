export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export const DAYS_ORDER: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

export interface DoctorDirectoryItem {
  id: string;
  profileId?: string;
  name: string;
  specialty: string;
  hospital?: string;
}

export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "IN_SESSION"
  | "COMPLETED"
  | "CANCELLED";

export interface AppointmentRecord {
  id: string;
  patientId: string;
  patientName?: string;
  patientEmail?: string;
  doctorId: string;
  doctorName?: string;
  doctorSpecialty?: string;
  slotId?: string;
  appointmentTime: string;
  status: AppointmentStatus;
  type: "IN_PERSON" | "TELEMEDICINE";
  paymentId?: string;
  sessionUrl?: string;
  notes?: string;
  cancellationReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BookAppointmentPayload {
  patientId: string;
  patientName: string;
  patientEmail: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  slotId: string;
  appointmentTime: string;
  type: "IN_PERSON" | "TELEMEDICINE";
  notes?: string;
}
