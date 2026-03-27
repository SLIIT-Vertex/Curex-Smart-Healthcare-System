import api from "./axiosInstance";
import { getDoctorAvailability, parseDateSlotKey } from "./availabilityService";
import type {
  AppointmentRecord,
  BookAppointmentPayload,
  DoctorDirectoryItem,
} from "../types/appointment.ts";

export interface DoctorBackendResponse {
  id: string;
  firstName: string;
  lastName: string;
  specialization: string;
  email?: string;
  phone?: string;
  consultationFee?: number;
  bio?: string;
  avatarUrl?: string;
  verified?: boolean;
}

export interface UserDoctorResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  specialization?: string;
  phone?: string;
  bio?: string;
}

export interface BookableDoctorResponse {
  userId: string;
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  specialization?: string;
}

export interface AvailabilitySlotResponse {
  id: string;
  doctorId: string;
  day: string;
  startTime: string;
  endTime: string;
  booked: boolean;
}

const DAY_NAMES = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

function dayForDateKey(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  return DAY_NAMES[d.getDay()];
}

function endTimeFromStart(startTime: string): string {
  const [h, m] = startTime.split(":").map(Number);
  const total = h * 60 + m + 30;
  const endHour = Math.floor(total / 60);
  const endMinute = total % 60;
  return `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}:00`;
}

function localSlotsFallback(doctorUserId: string): AvailabilitySlotResponse[] {
  const slotKeys = getDoctorAvailability(doctorUserId);
  return slotKeys
    .map((key) => parseDateSlotKey(key))
    .filter((parsed): parsed is { dateKey: string; time: string } =>
      Boolean(parsed),
    )
    .map(({ dateKey, time }, index) => ({
      id: `local-${doctorUserId}-${index}`,
      doctorId: doctorUserId,
      day: dayForDateKey(dateKey),
      startTime: `${time}:00`,
      endTime: endTimeFromStart(time),
      booked: false,
    }));
}

export interface DoctorProfileResponse {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  specialization?: string;
}

const doctorProfileIdByUserId = new Map<string, string>();

/** Fetch doctors approved for booking (doctor profile + user id) from doctor-service. */
export async function getDoctorDirectory(
  specialty?: string,
): Promise<DoctorDirectoryItem[]> {
  try {
    let userSpecialtyById = new Map<string, string>();
    try {
      const { data: users } =
        await api.get<UserDoctorResponse[]>("/api/users/doctors");
      if (Array.isArray(users)) {
        userSpecialtyById = new Map(
          users
            .filter((user) => !!user.specialization)
            .map((user) => [user.id, String(user.specialization).trim()]),
        );
      }
    } catch {
      // Keep going with doctor-service data only.
    }

    // Preferred source: doctor-service returns profileId + userId together.
    const { data } = await api.get<BookableDoctorResponse[]>(
      "/api/doctors/bookable",
    );
    if (Array.isArray(data) && data.length > 0) {
      const doctors = data.map((doctor) => {
        if (doctor.userId && doctor.id) {
          doctorProfileIdByUserId.set(doctor.userId, doctor.id);
        }
        const normalizedSpecialty =
          doctor.specialization?.trim() ||
          userSpecialtyById.get(doctor.userId) ||
          "General";
        return {
          // Keep doctor user ID for appointment ownership semantics.
          id: doctor.userId,
          profileId: doctor.id,
          name: `Dr. ${doctor.firstName} ${doctor.lastName}`.trim(),
          specialty: normalizedSpecialty,
          hospital: "Curex Health Network",
        };
      });

      if (specialty) {
        const key = specialty.toLowerCase();
        return doctors.filter((doctor) =>
          doctor.specialty.toLowerCase().includes(key),
        );
      }

      return doctors;
    }
  } catch {
    // Fallback below handles recovery.
  }

  try {
    // Fallback: merge approved doctors (user-service) with profiles (doctor-service search).
    const [{ data: approvedUsers }, { data: doctorProfiles }] =
      await Promise.all([
        api.get<UserDoctorResponse[]>("/api/users/doctors"),
        api.get<DoctorProfileResponse[]>("/api/doctors/search"),
      ]);

    if (!Array.isArray(approvedUsers) || approvedUsers.length === 0) {
      return [];
    }

    const profileByEmail = new Map<string, DoctorProfileResponse>();
    if (Array.isArray(doctorProfiles)) {
      for (const profile of doctorProfiles) {
        if (profile.email) {
          profileByEmail.set(profile.email.trim().toLowerCase(), profile);
        }
      }
    }

    const doctors = approvedUsers.map((user) => {
      const profile = user.email
        ? profileByEmail.get(user.email.trim().toLowerCase())
        : undefined;

      if (profile?.id) {
        doctorProfileIdByUserId.set(user.id, profile.id);
      }

      return {
        id: user.id,
        profileId: profile?.id,
        name: `Dr. ${user.firstName} ${user.lastName}`.trim(),
        specialty: profile?.specialization || user.specialization || "General",
        hospital: "Curex Health Network",
      };
    });

    if (specialty) {
      const key = specialty.toLowerCase();
      return doctors.filter((doctor) =>
        doctor.specialty.toLowerCase().includes(key),
      );
    }

    return doctors;
  } catch (error: unknown) {
    console.error(
      "Failed to fetch doctor directory from both /api/doctors/bookable and fallback sources:",
      {
        message: (error as { message?: string })?.message,
        status: (error as { response?: { status?: number } })?.response?.status,
        url: (error as { config?: { url?: string } })?.config?.url,
        data: (error as { response?: { data?: unknown } })?.response?.data,
      },
    );
    return [];
  }
}

async function resolveDoctorProfileId(
  doctorUserId: string,
): Promise<string | null> {
  const cached = doctorProfileIdByUserId.get(doctorUserId);
  if (cached) {
    return cached;
  }

  try {
    const { data } = await api.get<BookableDoctorResponse[]>(
      "/api/doctors/bookable",
    );
    if (!Array.isArray(data)) {
      throw new Error("Unexpected /api/doctors/bookable response");
    }
    const doctor = data.find((entry) => entry.userId === doctorUserId);
    if (doctor?.id) {
      doctorProfileIdByUserId.set(doctorUserId, doctor.id);
      return doctor.id;
    }
  } catch {
    // Try next fallback.
  }

  try {
    const [{ data: approvedUsers }, { data: doctorProfiles }] =
      await Promise.all([
        api.get<UserDoctorResponse[]>("/api/users/doctors"),
        api.get<DoctorProfileResponse[]>("/api/doctors/search"),
      ]);

    if (!Array.isArray(approvedUsers) || !Array.isArray(doctorProfiles)) {
      throw new Error("Unexpected fallback responses");
    }

    const user = approvedUsers.find((entry) => entry.id === doctorUserId);
    if (user?.email) {
      const profile = doctorProfiles.find(
        (entry) =>
          !!entry.email &&
          entry.email.trim().toLowerCase() === user.email.trim().toLowerCase(),
      );
      if (profile?.id) {
        doctorProfileIdByUserId.set(doctorUserId, profile.id);
        return profile.id;
      }
    }
  } catch {
    // Try final fallback.
  }

  try {
    const { data } = await api.get<DoctorProfileResponse>(
      `/api/doctors/by-user/${doctorUserId}`,
    );
    if (data?.id) {
      doctorProfileIdByUserId.set(doctorUserId, data.id);
      return data.id;
    }
  } catch {
    // No resolvable profile id.
  }

  return null;
}

export async function getDoctorSlots(
  doctorId: string,
): Promise<AvailabilitySlotResponse[]> {
  try {
    const doctorProfileId = await resolveDoctorProfileId(doctorId);
    if (!doctorProfileId) {
      console.warn(`No doctor profile found for user ${doctorId}`);
      return localSlotsFallback(doctorId);
    }

    const { data } = await api.get<AvailabilitySlotResponse[]>(
      `/api/doctors/${doctorProfileId}/availability`,
    );

    if (!Array.isArray(data)) {
      return localSlotsFallback(doctorId);
    }

    return data;
  } catch (error: unknown) {
    console.error(`Failed to fetch slots for doctor ${doctorId}:`, {
      message: (error as { message?: string })?.message,
      status: (error as { response?: { status?: number } })?.response?.status,
      data: (error as { response?: { data?: unknown } })?.response?.data,
    });
    return localSlotsFallback(doctorId);
  }
}

/** Fetch appointments for a specific doctor from appointment service */
export async function getDoctorAppointments(
  doctorId: string,
): Promise<AppointmentRecord[]> {
  try {
    console.log(`Fetching appointments for doctor ${doctorId}`);
    const { data } = await api.get<AppointmentRecord[]>(
      `/api/appointments/doctor/${doctorId}`,
    );
    console.log(`Appointments for doctor ${doctorId}:`, data);
    return Array.isArray(data) ? data : [];
  } catch (error: unknown) {
    console.error(`Failed to fetch appointments for doctor ${doctorId}:`, {
      message: (error as { message?: string })?.message,
      status: (error as { response?: { status?: number } })?.response?.status,
      data: (error as { response?: { data?: unknown } })?.response?.data,
    });
    return [];
  }
}

export async function bookAppointment(
  payload: BookAppointmentPayload,
): Promise<AppointmentRecord> {
  const { data } = await api.post<AppointmentRecord>(
    "/api/appointments",
    payload,
  );
  return data;
}

export async function getAppointmentsByDoctor(
  doctorId: string,
): Promise<AppointmentRecord[]> {
  const { data } = await api.get<AppointmentRecord[]>(
    `/api/appointments/doctor/${doctorId}`,
  );
  return data;
}

export async function getAppointmentsByPatient(
  patientId: string,
): Promise<AppointmentRecord[]> {
  const { data } = await api.get<AppointmentRecord[]>(
    `/api/appointments/patient/${patientId}`,
  );
  return data;
}

export async function getAppointmentById(
  appointmentId: string,
): Promise<AppointmentRecord> {
  const { data } = await api.get<AppointmentRecord>(
    `/api/appointments/${appointmentId}`,
  );
  return data;
}

export async function getAdminAppointments(): Promise<AppointmentRecord[]> {
  const { data } = await api.get<AppointmentRecord[]>("/api/appointments");
  return Array.isArray(data) ? data : [];
}

export async function adminCancelAppointment(
  appointmentId: string,
  reason: string,
): Promise<AppointmentRecord> {
  const { data } = await api.delete<AppointmentRecord>(
    `/api/appointments/${appointmentId}`,
    {
      params: { reason },
    },
  );
  return data;
}
