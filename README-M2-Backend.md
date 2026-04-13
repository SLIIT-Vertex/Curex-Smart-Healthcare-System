# Curex Healthcare Platform — M2 Backend Services

## Overview

This document covers the backend services developed for **Member 2 (M2)** in the Curex Healthcare Platform project:

- **Patient Service** (port 8083) — Patient profiles, medical history, and **read-only prescription lists** (aggregated from doctor-service via Feign using the patient’s **user id**).
- **Doctor Service** (port 8084) — Doctor profiles, availability, and **prescription issuance and lifecycle** (source of truth for prescription data in `curex_doctors`).
- **AI Symptom Service** (port 8085) — Symptom triage via **Groq Cloud** (`llama-3.1-8b-instant` by default), with a **rule-based fallback** when no API key is set or Groq fails.

## Architecture

### Services Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                        API Gateway (8080)                              │
│   /api/patients/**   → patient-service:8083                           │
│   /api/doctors/**    → doctor-service:8084 (rewrite to /doctors)      │
│   /api/prescriptions/** → doctor-service:8084 (rewrite to /prescriptions) │
│   /api/ai/**         → ai-symptom-service:8085                        │
└─────┬──────────────────────┬──────────────────────┬──────────────────┘
      │                      │                      │
┌─────▼─────────┐  ┌────────▼────────┐  ┌──────────▼───────┐
│ Patient       │  │ Doctor          │  │ AI Symptom        │
│ Service       │  │ Service         │  │ Service           │
│ (8083)        │  │ (8084)          │  │ (8085)            │
│               │  │                 │  │                   │
│ • Profile     │  │ • Profile       │  │ • Stateless       │
│ • Medical     │  │ • Availability  │  │ • Groq Cloud API  │
│   history     │  │ • Prescriptions │  │   (or fallback)   │
│ • Rx list     │  │ • Issue/cancel  │  │                   │
│   (Feign)     │  │   Rx            │  │                   │
└──────┬────────┘  └───────┬─────────┘  └──────────────────┘
       │                   │
  ┌────▼────┐         ┌────▼─────┐
  │curex_   │         │curex_    │
  │patients │         │doctors   │
  │(Postgres)│        │(Postgres)│
  └─────────┘         └──────────┘
```

### Tech Stack

- **Backend**: Spring Boot 3.2.2, Java 17
- **Database**: PostgreSQL (curex_patients, curex_doctors)
- **Message Broker**: RabbitMQ (doctor-service for prescription events)
- **AI**: Groq Cloud API (llama-3.1-8b-instant), OpenAI-compatible
- **Feign**: Patient → Doctor (`GET /prescriptions/patient/{id}`); Doctor → Appointment (eligibility + **visit phase at issue**); Doctor → User (approved doctors for booking)
- **Events**: Doctor-service publishes prescription events on RabbitMQ (e.g. `PrescriptionIssuedEvent` includes `appointmentId` and `visitStatusAtIssue` for downstream notifications/analytics)

## Quick Start

### Prerequisites

- Docker and Docker Compose (for full stack)
- Java 17+, Maven 3.8+ (for local dev)
- `.env` configured (copy from `.env.example`)

### 1. Full Stack (Docker)

```bash
# Ensure .env has JWT_SECRET, DB_USERNAME, DB_PASSWORD, GROQ_API_KEY (optional)
cp .env.example .env
# Edit .env with your values

# Start all services including M2
make docker-up
# or: docker-compose up --build -d

# Verify
curl -s http://localhost:8083/actuator/health  # patient-service
curl -s http://localhost:8084/actuator/health  # doctor-service
curl -s http://localhost:8085/actuator/health  # ai-symptom-service
```

### 2. Local Development

```bash
# Start Postgres + RabbitMQ (and optionally other infra)
docker-compose up -d postgres rabbitmq

# Run M2 services individually
make be-run-patient   # port 8083
make be-run-doctor   # port 8084
make be-run-ai       # port 8085 (source .env first for GROQ_API_KEY)
```

**AI Symptom Service with Groq:**

```bash
# Load GROQ_API_KEY from .env before running
set -a && source .env && set +a && make be-run-ai
```

## Makefile Targets

| Target | Description |
|--------|-------------|
| `make be-build-patient` | Build patient-service JAR |
| `make be-run-patient` | Run patient-service locally (port 8083) |
| `make be-build-doctor` | Build doctor-service JAR |
| `make be-run-doctor` | Run doctor-service locally (port 8084) |
| `make be-build-ai` | Build ai-symptom-service JAR |
| `make be-run-ai` | Run ai-symptom-service locally (port 8085) |

## API Endpoints

All endpoints are reached via the API Gateway at `http://localhost:8080`. Auth: JWT in `Authorization: Bearer <token>` unless noted.

### Patient Service (`/api/patients/**`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/patients/health` | Health check | No |
| POST | `/api/patients` | Create patient profile | Yes |
| GET | `/api/patients/by-user/{userId}` | Get patient profile by user-service user id | Yes |
| GET | `/api/patients/{id}` | Get patient by profile id | Yes |
| PUT | `/api/patients/{id}` | Update patient profile | Yes |
| GET | `/api/patients/{id}/history` | Get medical history | Yes |
| PUT | `/api/patients/{id}/history` | Update medical history | Yes |
| GET | `/api/patients/{id}/prescriptions` | List prescriptions for this patient | Yes |

**Prescriptions via patient-service:** The handler resolves the patient profile to the **user id** (`Patient.userId`) and calls doctor-service `GET /prescriptions/patient/{userId}`. Doctor-service stores `patientId` as that same user id (aligned with appointments). If doctor-service is unreachable, the API returns an **empty list** and logs a warning. Response DTOs mirror doctor-service and include **`visitStatusAtIssue`** (`IN_SESSION` \| `COMPLETED` \| null for legacy rows).

### Doctor Service (`/api/doctors/**`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/doctors/health` | Health check | No |
| POST | `/api/doctors` | Create doctor profile | Yes |
| GET | `/api/doctors/by-user/{userId}` | Get doctor profile by user id | Yes |
| GET | `/api/doctors/{id}` | Get doctor by profile id | Yes |
| PUT | `/api/doctors/{id}` | Update doctor profile | Yes |
| GET | `/api/doctors/search` | Search by specialty | Yes |
| GET | `/api/doctors/bookable` | Bookable doctors (approved accounts, etc.) | Yes |
| POST | `/api/doctors/{id}/availability` | Add availability slots | Yes |
| PUT | `/api/doctors/{id}/availability` | Replace all availability slots (bulk body) | Yes |
| GET | `/api/doctors/{id}/availability` | Get availability slots | Yes |
| PATCH | `/api/doctors/{id}/availability/{slotId}/book` | Mark slot as booked | Yes (M4 Feign) |

#### Appointment-service integration (bookable doctors)

**Appointment-service** should load the doctor picker / bookable list from doctor-service **directly** (same base URL as the existing `DoctorClient`, e.g. `http://doctor-service:8084` in Docker — **not** via `/api/doctors/**` on the gateway):

| Method | Path on doctor-service | Description |
|--------|-------------------------|-------------|
| GET | `/internal/doctors/approved-for-booking` | Returns doctor profiles whose **user account is `APPROVED`** in user-service (admin-approved). Response: JSON array of bookable doctor DTOs (`userId`, `id` doctor profile id, name, email, `specialization`, `consultationFee`, etc.). |

The Feign client in appointment-service should call this path (see `DoctorClient#getApprovedDoctorsForBooking()`). This route is `permitAll` on doctor-service and is intended for **internal network** calls only.

### Prescriptions (`/api/prescriptions/**` → **doctor-service**)

Prescriptions are **owned by doctor-service** (PostgreSQL `curex_doctors`, `prescriptions` table). The gateway routes `/api/prescriptions/**` to doctor-service (path rewritten to `/prescriptions/**`).

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/prescriptions` | Issue prescription | Yes — **requires `X-User-Id`** matching the prescribing doctor’s user id |
| PATCH | `/api/prescriptions/{id}/status` | Cancel prescription (`body: { "status": "CANCELLED" }`) | Yes — **requires `X-User-Id`** |
| GET | `/api/prescriptions/patient/{patientId}` | List by patient (user id) | Yes |
| GET | `/api/prescriptions/doctor/{doctorId}` | List by doctor profile id | Yes |

**Issue rules (server-side):**

- Appointment must exist and be **`IN_SESSION` or `COMPLETED`** (validated via Feign to appointment-service).
- **`doctorId`** and **`patientId`** in the body must match the appointment’s doctor and patient.
- **At most one prescription per appointment** (`existsByAppointmentId`).
- **`visitStatusAtIssue`** is **not** sent by the client; it is copied from the appointment status at issue time (`IN_SESSION` or `COMPLETED`) and returned on `PrescriptionResponse` for historical UI (“during visit” vs “after visit”). Legacy rows may have `null`.
- API **`status`** on a prescription is **derived** from dates and cancellation (medication lifecycle: e.g. pending / issued / active / completed), distinct from appointment visit status.

**Cancel rules:** Only transition to **`CANCELLED`** is supported via PATCH; other lifecycle states follow validity dates. The service verifies the caller is the issuing doctor (`X-User-Id`).

### AI Symptom Service (`/api/ai/**`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/ai/health` | Health check | No |
| POST | `/api/ai/symptoms/check` | Analyze symptoms (Groq or fallback) | Yes |

**Request:** `{ "symptoms": "string" }`

**Response** (`SymptomCheckResponse`):  

| Field | Description |
|-------|-------------|
| `conditions` | Up to three likely conditions (ordered) |
| `specialty` | Suggested specialty to consult |
| `urgency` | `"low"` \| `"medium"` \| `"high"` |
| `summary` | Short lay summary |
| `possibleCauses` | Optional list |
| `selfCareTips` | Optional list |
| `whenToSeekCare` | When to see a doctor |
| `emergencyWarning` | Emergency guidance, or null |

If **`GROQ_API_KEY`** is missing/blank or the Groq call throws, the service uses **`FallbackService`** (rule-based) and still returns the same shape where applicable.

## Configuration

### Environment Variables

| Variable | Service | Description | Default |
|----------|---------|-------------|---------|
| `SPRING_DATASOURCE_URL` | Patient, Doctor | JDBC URL (e.g. `jdbc:postgresql://postgres:5432/curex_patients`) | — |
| `DB_USERNAME` | Patient, Doctor | Database username | `curex_user` |
| `DB_PASSWORD` | Patient, Doctor | Database password | `curex_password` |
| `RABBITMQ_HOST` | Doctor | RabbitMQ host | `localhost` |
| `RABBITMQ_USERNAME` | Doctor | RabbitMQ username | `guest` |
| `RABBITMQ_PASSWORD` | Doctor | RabbitMQ password | `guest` |
| `SERVICES_DOCTOR_URL` | Patient, Appointment | Doctor service URL for Feign | `http://localhost:8084` |
| `SERVICES_APPOINTMENT_URL` | Doctor | Appointment service URL for Feign | `http://localhost:8088` |
| `SERVICES_USER_URL` | Doctor | User service URL (approved doctors lookup) | `http://localhost:8081` |
| `GROQ_API_KEY` | AI Symptom | Groq Cloud API key ([console.groq.com](https://console.groq.com)); empty = rule-based fallback | — |
| `AI_PROVIDER` | AI Symptom | AI provider | `groq` |
| `AI_MODEL` | AI Symptom | Model name | `llama-3.1-8b-instant` |

### Docker Compose

M2 services are defined in `docker-compose.yml`:

- `patient-service` — depends on postgres, doctor-service
- `doctor-service` — depends on postgres, rabbitmq, user-service (`SERVICES_USER_URL` for approved-doctor filter)
- `ai-symptom-service` — stateless, optional `GROQ_API_KEY`

### Kubernetes

Manifests in `k8s/deployments/`:

- `patient-service.yaml`
- `doctor-service.yaml`
- `ai-symptom-service.yaml`

Apply with: `kubectl apply -k k8s/`

## Project Structure

```
curex-be/services/
├── patient-service/
│   ├── src/main/java/com/curex/patient/
│   │   ├── controller/
│   │   ├── service/
│   │   ├── repository/
│   │   ├── entity/
│   │   ├── dto/
│   │   └── feign/
│   ├── pom.xml
│   └── Dockerfile
├── doctor-service/
│   ├── src/main/java/com/curex/doctor/
│   │   ├── controller/
│   │   ├── service/
│   │   ├── repository/
│   │   ├── entity/
│   │   ├── dto/
│   │   ├── event/
│   │   └── feign/
│   ├── pom.xml
│   └── Dockerfile
└── ai-symptom-service/
    ├── src/main/java/com/curex/ai/
    │   ├── controller/
    │   ├── service/
    │   ├── config/
    │   ├── dto/
    │   └── exception/
    ├── pom.xml
    └── Dockerfile
```

## Related Documentation
- **Developer Guide**: `docs/DEVERLOPER_GUIDE.md`

---

**Member 2 (M2) Backend Services — Patient, Doctor, AI Symptom**  
**Curex Healthcare Platform — SE3020**
