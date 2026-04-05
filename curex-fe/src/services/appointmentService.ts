import api from "./axiosInstance";
import {
  dateSlotKey,
  getDoctorAvailability,
  parseDateSlotKey,
  toDateKey,
} from "./availabilityService";
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
  specialty?: string;
  phone?: string;
  phoneNumber?: string;
  dob?: string;
  gender?: string;
  bio?: string;
  profileImageUrl?: string;
  yearsOfExperience?: number;
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

function normalizeStartTime(startTime: string): string {
  const raw = startTime.slice(0, 5);
  return `${raw}:00`;
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
  consultationFee?: number | string;
  bio?: string;
  avatarUrl?: string;
  profileImageUrl?: string;
}

const doctorProfileIdByUserId = new Map<string, string>();

type MaybeWrapped<T> = T | { payload?: T; data?: T };

function unwrapApi<T>(value: MaybeWrapped<T> | undefined | null): T | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "object" && value !== null) {
    const wrapped = value as { payload?: T; data?: T };
    if (wrapped.payload !== undefined) {
      return wrapped.payload;
    }
    if (wrapped.data !== undefined) {
      return wrapped.data;
    }
  }
  return value as T;
}

function normalizeDoctorProfile(
  raw: DoctorProfileResponse | null | undefined,
): DoctorProfileResponse | null {
  if (!raw) {
    return null;
  }

  const source = raw as DoctorProfileResponse & {
    specialty?: string;
    fee?: number | string;
    photoUrl?: string;
    imageUrl?: string;
    description?: string;
  };

  const feeNumber =
    typeof (source.consultationFee ?? source.fee) === "string"
      ? Number.parseFloat(String(source.consultationFee ?? source.fee))
      : (source.consultationFee ?? source.fee);

  return {
    ...source,
    specialization: source.specialization || source.specialty,
    bio: source.bio || source.description,
    consultationFee: Number.isFinite(feeNumber as number)
      ? (feeNumber as number)
      : undefined,
    avatarUrl:
      source.avatarUrl ||
      source.profileImageUrl ||
      source.photoUrl ||
      source.imageUrl,
  };
}

function normalizeFee(value: number | string | undefined): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function toAge(dob?: string): number | undefined {
  if (!dob) {
    return undefined;
  }
  const birth = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(birth.getTime())) {
    return undefined;
  }
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : undefined;
}

async function getDoctorProfileForBookable(
  doctor: BookableDoctorResponse,
): Promise<DoctorProfileResponse | null> {
  try {
    const byUser = await api.get<MaybeWrapped<DoctorProfileResponse>>(
      `/api/doctors/by-user/${doctor.userId}`,
    );
    const profile = normalizeDoctorProfile(unwrapApi(byUser.data));
    if (profile) {
      return profile;
    }
  } catch {
    // Fallback below.
  }

  try {
    const byId = await api.get<MaybeWrapped<DoctorProfileResponse>>(
      `/api/doctors/${doctor.id}`,
    );
    return normalizeDoctorProfile(unwrapApi(byId.data));
  } catch {
    return null;
  }
}

/** Fetch doctors approved for booking (doctor profile + user id) from doctor-service. */
export async function getDoctorDirectory(
  specialty?: string,
): Promise<DoctorDirectoryItem[]> {
  try {
    let userSpecialtyById = new Map<string, string>();
    let userById = new Map<string, UserDoctorResponse>();
    try {
      const { data: users } =
        await api.get<UserDoctorResponse[]>("/api/users/doctors");
      if (Array.isArray(users)) {
        userById = new Map(users.map((user) => [user.id, user]));
        userSpecialtyById = new Map(
          users
            .map((user) => ({
              id: user.id,
              specialty: user.specialization || user.specialty,
            }))
            .filter((user) => !!user.specialty)
            .map((user) => [user.id, String(user.specialty).trim()]),
        );
      }
    } catch {
      // Keep going with doctor-service data only.
    }

    // Preferred source: doctor-service returns profileId + userId together.
    const { data } = await api.get<MaybeWrapped<BookableDoctorResponse[]>>(
      "/api/doctors/bookable",
    );
    const bookableDoctors = unwrapApi(data);
    if (Array.isArray(bookableDoctors) && bookableDoctors.length > 0) {
      const profileResults = await Promise.allSettled(
        bookableDoctors.map(async (doctor) => {
          const profile = await getDoctorProfileForBookable(doctor);
          return [doctor.userId, profile] as const;
        }),
      );

      const profileByUserId = new Map<string, DoctorProfileResponse>();
      for (const result of profileResults) {
        if (result.status === "fulfilled") {
          const [userId, profile] = result.value;
          if (profile) {
            profileByUserId.set(userId, profile);
          }
        }
      }

      const doctors = bookableDoctors.map((doctor) => {
        if (doctor.userId && doctor.id) {
          doctorProfileIdByUserId.set(doctor.userId, doctor.id);
        }

        const profile = profileByUserId.get(doctor.userId);
        const user = userById.get(doctor.userId);
        const normalizedSpecialty =
          profile?.specialization?.trim() ||
          doctor.specialization?.trim() ||
          userSpecialtyById.get(doctor.userId) ||
          "General";

        const firstName = profile?.firstName || doctor.firstName;
        const lastName = profile?.lastName || doctor.lastName;

        return {
          // Keep doctor user ID for appointment ownership semantics.
          id: doctor.userId,
          profileId: profile?.id || doctor.id,
          name: `Dr. ${firstName} ${lastName}`.trim(),
          specialty: normalizedSpecialty,
          email: profile?.email || doctor.email,
          phone: user?.phoneNumber || user?.phone,
          gender: user?.gender,
          age: toAge(user?.dob),
          yearsOfExperience: user?.yearsOfExperience,
          bio: profile?.bio,
          avatarUrl: profile?.avatarUrl || user?.profileImageUrl,
          consultationFee: normalizeFee(profile?.consultationFee),
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
        specialty:
          profile?.specialization ||
          user.specialization ||
          user.specialty ||
          "General",
        email: profile?.email || user.email,
        phone: user.phoneNumber || user.phone,
        gender: user.gender,
        age: toAge(user.dob),
        yearsOfExperience: user.yearsOfExperience,
        bio: profile?.bio || user.bio,
        avatarUrl: profile?.avatarUrl || user.profileImageUrl,
        consultationFee: normalizeFee(profile?.consultationFee),
        hospital: user.yearsOfExperience
          ? `Curex Health Network • ${user.yearsOfExperience}+ yrs`
          : "Curex Health Network",
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

export async function saveDoctorSlots(
  doctorUserId: string,
  slotKeys: string[],
): Promise<AvailabilitySlotResponse[]> {
  const doctorProfileId = await resolveDoctorProfileId(doctorUserId);
  if (!doctorProfileId) {
    throw new Error("Could not resolve doctor profile id for availability save");
  }

  const unique = new Set<string>();
  const slots = slotKeys
    .map((key) => parseDateSlotKey(key))
    .filter((parsed): parsed is { dateKey: string; time: string } => Boolean(parsed))
    .map(({ dateKey, time }) => ({
      day: dayForDateKey(dateKey),
      startTime: normalizeStartTime(time),
      endTime: endTimeFromStart(time),
    }))
    .filter((slot) => {
      const composite = `${slot.day}_${slot.startTime}_${slot.endTime}`;
      if (unique.has(composite)) {
        return false;
      }
      unique.add(composite);
      return true;
    });

  const { data } = await api.put<AvailabilitySlotResponse[]>(
    `/api/doctors/${doctorProfileId}/availability`,
    { slots },
  );

  // Mirror as local fallback cache only; source of truth is backend.
  const normalizedLocal = (Array.isArray(data) ? data : []).flatMap((slot) => {
    const start = String(slot.startTime).slice(0, 5);
    const candidateDates = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + i);
      return d;
    });

    return candidateDates
      .filter((date) => dayForDateKey(toDateKey(date)) === String(slot.day))
      .map((date) => dateSlotKey(toDateKey(date), start));
  });

  try {
    localStorage.setItem(
      `curex_availability_${doctorUserId}`,
      JSON.stringify(Array.from(new Set(normalizedLocal))),
    );
  } catch {
    // Best-effort local cache.
  }

  return Array.isArray(data) ? data : [];
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
