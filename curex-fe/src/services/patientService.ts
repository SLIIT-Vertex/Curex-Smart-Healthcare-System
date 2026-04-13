import axios from "axios";
import api from "./axiosInstance";
import type {
  MedicalHistory,
  PatientProfile,
  PatientPrescription,
} from "../types/patient.ts";
import type { UserInfo, UserResponse } from "../types/auth";

/** User profile stores allergies / chronic conditions as free text; patient-service uses lists. */
function splitClinicalText(raw?: string | null): string[] {
  if (raw == null || !String(raw).trim()) return [];
  return String(raw)
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function mergeUniqueClinicalStrings(a: string[], b: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of [...a, ...b]) {
    const t = x.trim();
    const k = t.toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/**
 * Merges patient-service profile with user-service fields. Clinical data
 * (DOB, blood group, allergies, chronic conditions) is often only persisted on
 * {@link UserResponse} from registration / settings, not on the patient record.
 */
export function enrichPatientProfileWithUser(
  patient: PatientProfile,
  user: UserResponse,
): PatientProfile {
  const userAllergies = splitClinicalText(user.allergies);
  const userChronic = splitClinicalText(user.chronicConditions);
  const pAllergies = patient.medicalHistory?.allergies ?? [];
  const pConditions = patient.medicalHistory?.conditions ?? [];

  return {
    ...patient,
    dateOfBirth: patient.dateOfBirth || user.dob || undefined,
    bloodType: patient.bloodType || user.bloodGroup || undefined,
    medicalHistory: {
      allergies: mergeUniqueClinicalStrings(pAllergies, userAllergies),
      conditions: mergeUniqueClinicalStrings(pConditions, userChronic),
      pastSurgeries: patient.medicalHistory?.pastSurgeries ?? [],
    },
  };
}

/*  API functions  */

export async function createPatientProfile(
  _user: UserInfo,
): Promise<PatientProfile> {
  const { data } = await api.post<PatientProfile>(
    "/api/users/me/role-profile/bootstrap",
    {},
  );
  return data;
}

/**
 * Resolves the patient-service profile for a given user ID.
 * If no profile exists yet (404), one is auto-created so pages that depend on
 * a patient-service record (prescriptions, reports) work like appointments.
 */
export async function getPatientByUserId(
  userId: string,
  user?: UserInfo,
): Promise<{ id: string; name: string; email: string }> {
  try {
    const { data } = await api.get<PatientProfile>(
      `/api/users/${userId}/patient-profile`,
    );
    return { id: data.id, name: data.name, email: data.email };
  } catch (err) {
    const is404 = axios.isAxiosError(err) && err.response?.status === 404;

    if (is404 && user) {
      const created = await createPatientProfile(user);
      return { id: created.id, name: created.name, email: created.email };
    }
    throw err;
  }
}

export async function getProfile(patientId: string): Promise<PatientProfile> {
  const { data } = await api.get<PatientProfile>(`/api/patients/${patientId}`);
  return data;
}

/**
 * Resolves a patient profile when the identifier might be either:
 * - patient-service profile id (`GET /api/patients/{id}`), or
 * - auth user id (`GET /api/users/{userId}/patient-profile`), which is what
 *   appointments and prescriptions use for `patientId` in this app.
 */
export async function getPatientProfileResolved(
  patientIdOrUserId: string,
): Promise<PatientProfile> {
  try {
    return await getProfile(patientIdOrUserId);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      const { data } = await api.get<PatientProfile>(
        `/api/users/${patientIdOrUserId}/patient-profile`,
      );
      return data;
    }
    throw err;
  }
}

/**
 * Full patient context for doctor flows: patient-service identity + user-service
 * clinical fields (same `appointmentPatientUserId` as on appointments).
 */
export async function getPatientClinicalProfileForAppointment(
  appointmentPatientUserId: string,
): Promise<PatientProfile> {
  const patient = await getPatientProfileResolved(appointmentPatientUserId);
  try {
    const { data: user } = await api.get<UserResponse>(
      `/api/users/${appointmentPatientUserId}`,
    );
    return enrichPatientProfileWithUser(patient, user);
  } catch {
    return patient;
  }
}

export async function updateProfile(
  _patientId: string,
  data: Partial<PatientProfile>,
): Promise<PatientProfile> {
  await api.put("/api/users/me/profile", {
    dob: data.dateOfBirth,
    gender: data.gender,
    bloodGroup: data.bloodType,
    address: data.address,
  });
  const { data: updated } = await api.get<PatientProfile>(
    "/api/users/me/patient-profile",
  );
  return updated;
}

export async function getMedicalHistory(
  patientId: string,
): Promise<MedicalHistory> {
  const { data } = await api.get<MedicalHistory>(
    `/api/patients/${patientId}/history`,
  );
  return data;
}

export async function getPrescriptions(
  patientId: string,
): Promise<PatientPrescription[]> {
  const { data } = await api.get<PatientPrescription[]>(
    `/api/patients/${patientId}/prescriptions`,
  );
  return data;
}
