# Prescription Feature — Phase-by-Phase Implementation Plan

**M2 Deliverable:** Wire prescription feature from backend to frontend, with rich prescription details.  
**Order:** Doctor side first, then patient side.

---

## Current State Summary

### Backend (Already Implemented)

| Component | Status | Notes |
|-----------|--------|-------|
| **Doctor Service** | ✅ Done | `PrescriptionController` at `/prescriptions` |
| **Patient Service** | ✅ Done | Feign to doctor-service for `GET /patients/{id}/prescriptions` |
| **API Gateway** | ✅ Done | `/api/prescriptions/**` → doctor-service:8084 |
| **Appointment Validation** | ✅ Done | Prescriptions only for IN_SESSION or COMPLETED appointments |

**Existing API Endpoints:**
- `POST /api/prescriptions` — Issue prescription (doctor, patient, appointment, medicines, instructions, validFrom, validTo)
- `GET /api/prescriptions/patient/{patientId}` — Patient's prescriptions
- `GET /api/prescriptions/doctor/{doctorId}` — Doctor's prescriptions
- `GET /api/patients/{id}/prescriptions` — Patient service proxy (same data)

**Backend Entities:**
- Prescription: `id`, `doctor`, `patientId`, `appointmentId`, `medicines` (TEXT), `instructions`, `validFrom`, `validTo`, `status`, `issuedAt`
- PrescriptionResponse: includes `doctorName`; missing `doctorSpecialty`, `patientName`, `diagnosis`

### Frontend (Current State)

| Page / Component | Status | Notes |
|------------------|--------|-------|
| **DoctorPrescriptions** | ❌ Mock only | Uses MOCK_PRESCRIPTIONS, MOCK_PATIENTS, MOCK_APPOINTMENTS |
| **PrescriptionForm** | ✅ UI ready | MedicineLine (name, dosage, frequency, duration); no API call |
| **PatientPrescriptions** | ⚠️ Partial | Calls `getPrescriptions()` but uses MOCK_PATIENT_ID; falls back to mock on error |
| **patientService.getPrescriptions** | ✅ Wired | Uses `/patients/{id}/prescriptions` via API gateway |
| **appointmentService** | ⚠️ Direct URL | Uses `localhost:8088` directly; no JWT for doctor context |

---

## Rich Prescription Standard

A prescription should include:

| Field | Backend | Frontend | Priority |
|-------|---------|----------|----------|
| Prescription ID | ✅ | ✅ | - |
| Issue date | ✅ `issuedAt` | ✅ | - |
| Valid from / Valid to | ✅ | ⚠️ Missing in patient type | P1 |
| Doctor name | ✅ | ✅ | - |
| Doctor specialty | ❌ | - | P1 |
| Doctor qualifications | ❌ | - | P2 |
| Patient name | ❌ | - | P1 |
| Appointment reference | ✅ | ✅ | - |
| Diagnosis / Clinical notes | ❌ | - | P2 |
| Medicines (structured) | ⚠️ Plain text | ✅ MedicineLine | P1 |
| Instructions | ✅ | ✅ | - |
| Status | ✅ | ✅ | - |

---

## Phase 1 — Backend: Enrich Prescription Response (Optional but Recommended) ✅ DONE

**Goal:** Add `doctorSpecialty`, `patientName` to `PrescriptionResponse` for richer display.

### 1.1 Add `doctorSpecialty` to PrescriptionResponse ✅

- **File:** `curex-be/services/doctor-service/.../dto/PrescriptionResponse.java`
- **Change:** Add `private String doctorSpecialty;`
- **File:** `PrescriptionService.toPrescriptionResponse()`
- **Change:** Set `doctorSpecialty` from `prescription.getDoctor().getSpecialization()`

### 1.2 Add `patientName` ✅

- Added `patientName` (optional) to `IssuePrescriptionRequest` and `PrescriptionResponse`.
- Prescription entity has `patient_name` column; populated from request or `appointment.getPatientName()` at issue time.

### 1.3 Optional: Add `diagnosis` / `clinicalNotes` to Prescription ✅

- **Entity:** Added `diagnosis` (TEXT, nullable) to `Prescription`
- **Request/Response:** Added to `IssuePrescriptionRequest`, `PrescriptionResponse`
- **Migration:** Uses Hibernate `ddl-auto: update` for dev

---

## Phase 2 — Doctor Side: Wire to Real APIs

**Goal:** Doctor can view their prescriptions from backend and issue new ones linked to real appointments.

### 2.1 Create `prescriptionService.ts` (Frontend)

- **Path:** `curex-fe/src/services/prescriptionService.ts`
- **Functions:**
  - `issuePrescription(payload: IssuePrescriptionPayload): Promise<PrescriptionResponse>`
  - `getPrescriptionsByDoctor(doctorId: string): Promise<PrescriptionResponse[]>`
- **Base URL:** Use `api` (axios instance) so JWT is attached — `/api/prescriptions`

### 2.2 Add Doctor-by-User Lookup

**Option A — Backend:** Add `GET /doctors/by-user/{userId}` in doctor-service.

- **DoctorController:** New endpoint
- **DoctorService:** `getByUserId(userId)` using `doctorRepository.findByUserId(userId)`
- **Usage:** Frontend calls after login to get doctor profile ID

**Option B — Frontend:** Use existing `GET /doctors/{id}` if doctor ID is stored somewhere (e.g. profile creation returns it). For now, doctors may use mock IDs like `doc-001` — we need a way to resolve `user.id` → `doctor.id`.

- **Recommendation:** Add `GET /api/doctors/by-user/{userId}` (or `?userId=`) in doctor-service and gateway. Gateway already routes `/api/doctors/**` to doctor-service.

### 2.3 Use Gateway for Appointments (with JWT)

- **Current:** `appointmentService` uses `VITE_APPOINTMENT_API_URL` (default `localhost:8088`) — bypasses gateway and JWT.
- **Change:** Use main `api` instance with base `/api/appointments` so requests go through gateway and include JWT.
- **File:** `curex-fe/src/services/appointmentService.ts`
- **Update:** Use `api` from `axiosInstance` when `VITE_API_URL` is set, or add `VITE_USE_GATEWAY_FOR_APPOINTMENTS=true` to switch.

### 2.4 DoctorPrescriptions Page

- Replace `MOCK_PRESCRIPTIONS` with `getPrescriptionsByDoctor(doctorId)`.
- Get `doctorId` from: (a) `GET /doctors/by-user/{userId}` using `user.id`, or (b) doctor profile stored in state/localStorage after profile load.
- Replace `MOCK_PATIENTS` and `MOCK_APPOINTMENTS` with real data:
  - **Appointments:** `getAppointmentsByDoctor(doctorId)` — filter for `IN_SESSION` or `COMPLETED`.
  - **Patients:** Derive from appointments (`patientId`, `patientName`) or fetch patient profiles if needed.
- **handleIssuePrescription:** Call `issuePrescription` API instead of local state update.
- **Payload mapping:**
  - `medicines`: Serialize `MedicineLine[]` to string, e.g. `"Paracetamol 500mg, 2x daily, 7 days; Vitamin D3 1000IU, 1x morning"`
  - `validFrom`: Today
  - `validTo`: e.g. 30 days from today, or user-selectable in form

### 2.5 PrescriptionForm Updates

- Add `validFrom` and `validTo` date inputs (default: today, +30 days).
- **Appointment:** Make required when issuing — backend requires it.
- Ensure `patientEmail` is sent when available (from appointment) for notification.
- On submit, call `issuePrescription` and refresh list on success.

### 2.6 Patient Name Mapping

- For table display, use `patientName` from the selected appointment or from a map built from appointments.
- No backend change required if we derive it from appointments.

---

## Phase 3 — Patient Side: Wire to Real Data

**Goal:** Patient sees their prescriptions from backend with full details.

### 3.1 Use Auth-Based Patient ID

- Replace `MOCK_PATIENT_ID` with `user.id` (or patient profile ID).
- **Mapping:** Patient entity has `userId`. Auth user has `id`. Need `userId` → `patientId`.
- **Options:**
  - Add `GET /api/patients/by-user/{userId}` in patient-service.
  - Or use `user.id` as `patientId` if patient and user IDs are the same in your schema (verify with patient-service).
  - **Recommendation:** Add `GET /api/patients/by-user/{userId}` in patient-service for consistency with doctor.

### 3.2 Update PatientPrescription Type

- Add `validFrom`, `validTo`, `doctorSpecialty` to `PatientPrescription` in `curex-fe/src/types/patient.ts`.
- Backend `PrescriptionResponse` already has these (after Phase 1); align types.

### 3.3 PatientPrescriptions Page

- Use `user.id` to resolve `patientId` (via `/patients/by-user/{userId}` or equivalent).
- Call `getPrescriptions(patientId)` — already uses `/patients/{id}/prescriptions`.
- Display `validFrom`, `validTo`, `doctorSpecialty` in expanded row or table.
- Remove mock fallback for production, or keep as dev fallback with a flag.

### 3.4 Rich Prescription View (Patient)

- In expanded row or "View" modal, show:
  - Prescription ID, Issue date
  - Doctor name, specialty
  - Valid from / Valid to
  - Medicines (formatted)
  - Instructions
  - Status
  - Appointment reference (if useful)

---

## Phase 4 — Optional Enhancements

### 4.1 Structured Medicines (JSON)

- **Backend:** Add `medicines_json` (JSONB) column alongside `medicines` (keep for backward compatibility).
- **Request:** Accept `List<MedicineLine>` in `IssuePrescriptionRequest`, store as JSON, and also create human-readable string for `medicines`.
- **Response:** Return structured list for frontend rendering.

### 4.2 Diagnosis Field

- Add `diagnosis` to entity, request, response.
- Add input in PrescriptionForm.

### 4.3 Prescription PDF / Print

- Add "Print" or "Download PDF" for patient and doctor views.
- Use browser print with a printable stylesheet, or a library like `jspdf` for PDF generation.

---

## Implementation Order (Recommended)

| Phase | Tasks | Est. |
|-------|-------|------|
| **Phase 2** | prescriptionService, doctor-by-user, appointment via gateway, DoctorPrescriptions wired, PrescriptionForm + validFrom/validTo | 1–2 days |
| **Phase 3** | patient-by-user (or ID resolution), PatientPrescription type, PatientPrescriptions wired | 0.5–1 day |
| **Phase 1** | Enrich PrescriptionResponse (doctorSpecialty, etc.) | 0.5 day |
| **Phase 4** | Structured medicines, diagnosis, print | As needed |

Start with Phase 2 (doctor side), then Phase 3 (patient side). Phase 1 can be done in parallel or immediately after.

---

## API Quick Reference

### Issue Prescription

```
POST /api/prescriptions
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "doctorId": "uuid",
  "patientId": "uuid",
  "appointmentId": "uuid",
  "patientEmail": "optional-for-notification",
  "patientName": "optional-from-appointment-for-display",
  "diagnosis": "optional-clinical-notes",
  "medicines": "Paracetamol 500mg, 2x daily, 7 days; ...",
  "instructions": "Take with food",
  "validFrom": "2025-03-24",
  "validTo": "2025-04-24"
}
```

### Get Doctor's Prescriptions

```
GET /api/prescriptions/doctor/{doctorId}
Authorization: Bearer <jwt>
```

### Get Patient's Prescriptions

```
GET /api/patients/{patientId}/prescriptions
Authorization: Bearer <jwt>
```

---

## Checklist Summary

**Doctor Side:**
- [x] Add `prescriptionService.ts` with `issuePrescription`, `getPrescriptionsByDoctor`
- [x] Add `GET /doctors/by-user/{userId}` (or equivalent) for doctor ID resolution
- [x] Use gateway for appointment API (JWT)
- [x] DoctorPrescriptions: fetch prescriptions + appointments, replace mock
- [x] PrescriptionForm: validFrom/validTo, require appointment, call API
- [x] Resolve doctorId from auth (user.id → doctor profile)

**Patient Side:**
- [x] Resolve patientId from auth (user.id → patient profile via `/api/patients/by-user/{userId}`)
- [x] Update PatientPrescription type (validFrom, validTo, doctorSpecialty, diagnosis)
- [x] PatientPrescriptions: use real patientId, display all fields
- [x] Rich Prescription View: expanded row with full details

**Backend (Optional):**
- [x] Add doctorSpecialty to PrescriptionResponse
- [x] Add patientName to IssuePrescriptionRequest and PrescriptionResponse
- [x] Add diagnosis to Prescription (optional)
- [x] Add doctor-by-user endpoint (`GET /api/doctors/by-user/{userId}`)
- [x] Add patient-by-user endpoint (`GET /api/patients/by-user/{userId}`)
