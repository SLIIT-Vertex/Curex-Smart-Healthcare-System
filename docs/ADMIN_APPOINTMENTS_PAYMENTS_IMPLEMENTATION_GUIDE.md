# Admin Appointments + Payments Implementation Guide

## 1. Purpose

This guide defines how to implement two new Admin dashboard tabs:

- Appointments
- Payments

It is written as a handoff spec for separate developers.

Constraint from product request:

- Do not create new backend microservices.
- Use existing services (`appointment-service`, `payment-service`, `user-service`, `notification-service`) and extend endpoints where needed.

## 2. Goals

- Give admins operational visibility into appointments and payments.
- Let admins cancel appointments safely (with reason + audit trail).
- Let admins monitor payment status and handle exceptions.
- Keep all actions role-gated and auditable.

## 3. High-Level Features

## 3.1 Appointments Tab (Admin)

- KPI cards:
  - Total appointments
  - Pending
  - Confirmed
  - Completed
  - Cancelled
- Table with filters:
  - Date range
  - Doctor
  - Specialty
  - Patient
  - Type (`IN_PERSON`, `TELEMEDICINE`)
  - Status
- Row actions:
  - View details
  - Cancel appointment (admin reason required)
  - Reschedule (phase 2)
- Operational tools:
  - Quick search by appointment ID
  - Export CSV
  - Status trend chart (optional)

## 3.2 Payments Tab (Admin)

- KPI cards:
  - Total collected
  - Pending
  - Success
  - Failed
- Table with filters:
  - Date range
  - Patient ID
  - Appointment ID
  - Status
  - Min/max amount
- Row actions:
  - View payment details
  - Retry/confirm payment (manual ops path)
  - Refund request flow (phase 2, if Stripe flow supports it)
- Reconciliation tools:
  - Detect appointment with missing payment
  - Detect payment without matching appointment

## 4. Existing Endpoints You Can Reuse Now

## 4.1 Appointment Service

Base path: `/api/appointments`

1. `GET /api/appointments`

- Use: Admin list all appointments
- Auth: Admin (`X-User-Role=ADMIN`)
- Response shape:

```json
[
  {
    "id": "apt_123",
    "patientId": "user_1",
    "patientName": "Jane Doe",
    "patientEmail": "jane@example.com",
    "doctorId": "doc_10",
    "doctorName": "Dr Smith",
    "doctorSpecialty": "Cardiology",
    "slotId": "slot_99",
    "appointmentTime": "2026-04-12T09:30:00",
    "status": "CONFIRMED",
    "type": "IN_PERSON",
    "paymentId": "pay_abc",
    "sessionUrl": null,
    "notes": "Bring reports",
    "cancellationReason": null,
    "createdAt": "2026-04-01T10:00:00",
    "updatedAt": "2026-04-01T10:05:00"
  }
]
```

2. `GET /api/appointments/{id}`

- Use: details drawer/modal
- Auth: Admin/owner doctor/owner patient
- Response: same `AppointmentResponse` shape as above

3. `DELETE /api/appointments/{id}?reason=...`

- Use: admin cancellation action (already available)
- Auth: Admin allowed
- Request shape:
  - Path param: `id`
  - Query param: `reason` (string)
- Response shape:

```json
{
  "id": "apt_123",
  "status": "CANCELLED",
  "cancellationReason": "Cancelled by admin: doctor unavailable",
  "updatedAt": "2026-04-12T08:15:11"
}
```

4. `PATCH /api/appointments/{id}`

- Use: update status/time (if enabled for admin UX)
- Request shape:

```json
{
  "newAppointmentTime": "2026-04-15T11:00:00",
  "cancellationReason": "...",
  "status": "CONFIRMED"
}
```

## 4.2 Payment Service

Base path: `/api`

1. `GET /api/payments/{id}`

- Use: payment detail drawer/modal
- Response envelope:

```json
{
  "timestamp": "2026-03-26T18:10:10Z",
  "message": "Payment details",
  "data": {
    "id": "0e6e8e40-4f3a-4f57-b3d7-1b9cf37f26e1",
    "appointmentId": "apt_123",
    "patientId": "user_1",
    "amount": 150.0,
    "currency": "USD",
    "status": "SUCCESS",
    "stripeSessionId": "cs_test_...",
    "stripePaymentIntentId": "pi_...",
    "paymentMethod": "card",
    "createdAt": "2026-03-26T18:00:00Z",
    "updatedAt": "2026-03-26T18:02:00Z"
  }
}
```

2. `GET /api/payments/patients/{patientId}`

- Use: temporary listing by patient, not full admin analytics
- Response envelope:

```json
{
  "timestamp": "2026-03-26T18:10:10Z",
  "message": "Patient payments",
  "data": [
    {
      "id": "0e6e8e40-4f3a-4f57-b3d7-1b9cf37f26e1",
      "appointmentId": "apt_123",
      "patientId": "user_1",
      "amount": 150.0,
      "currency": "USD",
      "status": "SUCCESS",
      "stripeSessionId": "cs_test_...",
      "stripePaymentIntentId": "pi_...",
      "paymentMethod": "card",
      "createdAt": "2026-03-26T18:00:00Z",
      "updatedAt": "2026-03-26T18:02:00Z"
    }
  ]
}
```

3. `POST /api/payments/{id}/confirm`

- Use: manual confirm action for ops/testing
- Response envelope:

```json
{
  "timestamp": "2026-03-26T18:10:10Z",
  "message": "Payment confirmed",
  "data": {
    "id": "0e6e8e40-4f3a-4f57-b3d7-1b9cf37f26e1",
    "status": "SUCCESS"
  }
}
```

## 5. Gaps and Proposed Endpoint Additions (No New Service)

These should be added by backend teams in existing services.

## 5.1 Appointment Admin Query Endpoint

`GET /api/appointments/admin`

Purpose:

- Server-side pagination and filtering for admin table.

Query params (example):

- `page=0`
- `size=20`
- `status=PENDING`
- `type=TELEMEDICINE`
- `doctorId=...`
- `patientId=...`
- `from=2026-03-01T00:00:00`
- `to=2026-03-31T23:59:59`

Response shape:

```json
{
  "content": [
    {
      "id": "apt_123",
      "patientId": "user_1",
      "doctorId": "doc_10",
      "appointmentTime": "2026-04-12T09:30:00",
      "status": "PENDING",
      "type": "TELEMEDICINE",
      "cancellationReason": null,
      "createdAt": "2026-04-01T10:00:00",
      "updatedAt": "2026-04-01T10:05:00"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 154,
  "totalPages": 8
}
```

## 5.2 Appointment Admin Cancel Endpoint (Cleaner than query param)

`POST /api/appointments/{id}/admin-cancel`

Request shape:

```json
{
  "reason": "Doctor unavailable due to emergency",
  "notifyPatient": true
}
```

Response shape:

```json
{
  "id": "apt_123",
  "status": "CANCELLED",
  "cancellationReason": "Doctor unavailable due to emergency",
  "updatedAt": "2026-04-12T08:15:11"
}
```

Notes:

- Current `DELETE /api/appointments/{id}?reason=...` already works for admin.
- This new endpoint is suggested for cleaner API contracts and easier audit metadata.

## 5.3 Payment Admin List Endpoint

`GET /api/payments/admin`

Query params:

- `page`, `size`
- `status`
- `patientId`
- `appointmentId`
- `minAmount`, `maxAmount`
- `from`, `to`

Response shape:

```json
{
  "content": [
    {
      "id": "0e6e8e40-4f3a-4f57-b3d7-1b9cf37f26e1",
      "appointmentId": "apt_123",
      "patientId": "user_1",
      "amount": 150.0,
      "currency": "USD",
      "status": "SUCCESS",
      "paymentMethod": "card",
      "createdAt": "2026-03-26T18:00:00Z",
      "updatedAt": "2026-03-26T18:02:00Z"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 842,
  "totalPages": 43
}
```

## 5.4 Payment Admin Summary Endpoint

`GET /api/payments/admin/summary?from=...&to=...`

Response shape:

```json
{
  "totalCount": 842,
  "pendingCount": 41,
  "successCount": 761,
  "failedCount": 40,
  "totalCollected": 124550.75,
  "currency": "USD"
}
```

## 6. Frontend Implementation Plan

## 6.1 Routes

Add under admin layout:

- `/admin/appointments`
- `/admin/payments`

## 6.2 New Pages

- `src/pages/admin/AdminAppointments.tsx`
- `src/pages/admin/AdminPayments.tsx`

## 6.3 Shared Components

- KPI card grid component
- Filter bar component
- Data table with pagination
- Action modal:
  - Cancel appointment modal (reason required)
  - Confirm payment modal (optional)

## 6.4 Service Layer Additions

- `appointmentService.ts`:
  - `getAdminAppointments(filters)`
  - `adminCancelAppointment(id, reason)`
- `paymentService.ts`:
  - `getAdminPayments(filters)`
  - `getPaymentSummary(dateRange)`

## 7. Authorization and Audit Requirements

- Only `ADMIN` can access new tabs and endpoints.
- Include actor metadata in logs/events:
  - `adminId`
  - action
  - reason
  - target resource ID
  - timestamp
- Cancellation reason should be mandatory for admin cancel.

## 8. Error Handling Contract (UI)

- Show per-request toast and inline table row errors.
- Typical cases:
  - `401`: session expired -> redirect login
  - `403`: no permission
  - `404`: resource not found (already changed/deleted)
  - `409`: invalid state transition (already cancelled/completed)
  - `5xx`: retry suggestion

## 9. Suggested Phased Delivery

Phase 1 (fastest value):

- Admin Appointments page
- Use existing `GET /api/appointments` + `DELETE /api/appointments/{id}?reason=...`
- Basic filters client-side

Phase 2:

- Backend pagination/filter endpoints (`/admin` variants)
- Admin Payments list + summary
- Stronger reconciliation widgets

Phase 3:

- Refund/dispute workflows
- CSV exports + scheduled reports
- Rich audit timeline UI

## 10. QA Checklist

- Admin can cancel appointment with reason.
- Cancelled appointment status updates correctly in table and details.
- Non-admin users cannot call admin actions.
- Payment table filters return expected subsets.
- Empty state and no-data views are user-friendly.
- Pagination and sorting do not break on large datasets.
- Error states are surfaced clearly with retry path.

---

Owner note:

- This document intentionally focuses on implementation contracts and payload shapes so separate backend/frontend developers can work in parallel without creating new microservices.
