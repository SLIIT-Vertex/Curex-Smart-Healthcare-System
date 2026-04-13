# Curex Payment Journey

## 1. Scope and intent
This document describes the end-to-end payment journey implemented in Curex, covering:
- Frontend patient and admin flows
- API Gateway routing and authentication behavior
- Payment service domain model and Stripe integration
- Webhook handling and status transitions
- Cross-service effects in appointment-service and notification-service
- Runtime configuration and troubleshooting points

Primary implementation sources:
- [curex-be/services/payment-service/src/main/java/com/curex/payment/controller/PaymentController.java](curex-be/services/payment-service/src/main/java/com/curex/payment/controller/PaymentController.java)
- [curex-be/services/payment-service/src/main/java/com/curex/payment/service/PaymentServiceImpl.java](curex-be/services/payment-service/src/main/java/com/curex/payment/service/PaymentServiceImpl.java)
- [curex-be/services/payment-service/src/main/java/com/curex/payment/service/StripeServiceImpl.java](curex-be/services/payment-service/src/main/java/com/curex/payment/service/StripeServiceImpl.java)
- [curex-fe/src/pages/patient/PatientCheckout.tsx](curex-fe/src/pages/patient/PatientCheckout.tsx)
- [curex-fe/src/pages/patient/PatientAppointments.tsx](curex-fe/src/pages/patient/PatientAppointments.tsx)

## 2. High-level architecture

### 2.1 Components
- Frontend: Vite/React app initiates checkout and handles Stripe return URLs.
- API Gateway: routes /api/payments/** to payment-service and injects trusted user headers from JWT.
- Payment service: creates payment records, opens Stripe Checkout sessions, validates webhook signatures, updates payment state.
- Stripe: hosts checkout page and sends webhook events.
- RabbitMQ: carries payment confirmation events to downstream services.
- Appointment service: marks appointment as CONFIRMED when payment is confirmed.
- Notification service: sends/records payment confirmation notifications.

### 2.2 Route path
- Browser calls: http://localhost:8080/api/payments/...
- Gateway route definition: [curex-be/api-gateway/src/main/resources/application.yml](curex-be/api-gateway/src/main/resources/application.yml)
- Upstream target: payment-service on port 8087

## 3. Data model and status lifecycle

### 3.1 Payment entity
The payment row is persisted in payments table with key fields:
- id (UUID)
- appointmentId
- patientId
- amount, currency
- status
- stripeSessionId (unique)
- stripePaymentIntentId
- paymentMethod
- createdAt, updatedAt

Source:
- [curex-be/services/payment-service/src/main/java/com/curex/payment/entity/Payment.java](curex-be/services/payment-service/src/main/java/com/curex/payment/entity/Payment.java)

### 3.2 Status values
Defined states:
- PENDING
- SUCCESS
- FAILED
- CANCELLED

Source:
- [curex-be/services/payment-service/src/main/java/com/curex/payment/entity/PaymentStatus.java](curex-be/services/payment-service/src/main/java/com/curex/payment/entity/PaymentStatus.java)

### 3.3 Actual transitions in current implementation
- New checkout creation: PENDING
- Stripe checkout.session.completed webhook: PENDING -> SUCCESS
- Stripe checkout.session.expired webhook: PENDING -> CANCELLED
- FAILED is defined but not explicitly set by webhook handlers today

Source:
- [curex-be/services/payment-service/src/main/java/com/curex/payment/service/PaymentServiceImpl.java](curex-be/services/payment-service/src/main/java/com/curex/payment/service/PaymentServiceImpl.java)

## 4. API surface

### 4.1 Public business endpoints
Base path in payment-service: /api

1. POST /api/payments/appointments/{appointmentId}
- Creates local payment row first, then creates Stripe Checkout Session.
- Request body:
  - patientId (required)
  - amount > 0 (required)
  - currency (required)
  - successUrl (optional override)
  - cancelUrl (optional override)
- Returns checkoutUrl, paymentId, stripeSessionId, and payment metadata.

2. GET /api/payments/{id}
- Fetch a single payment by UUID.

3. GET /api/payments/patients/{patientId}
- Lists patient payments ordered by latest first.
- Authorization check in controller:
  - ADMIN can query any patient
  - PATIENT can query only own patientId (must match X-User-Id)

4. GET /api/payments/admin
- Admin-only listing endpoint with optional filters:
  - status
  - patientId
  - appointmentId

5. POST /api/payments/webhook
- Stripe webhook endpoint (expects raw body + Stripe-Signature)
- Verifies signature and processes supported event types.

Source:
- [curex-be/services/payment-service/src/main/java/com/curex/payment/controller/PaymentController.java](curex-be/services/payment-service/src/main/java/com/curex/payment/controller/PaymentController.java)

### 4.2 Internal data governance endpoint
- DELETE /api/internal/users/{userId}/purge
- Deletes payment rows for a user (patientId).

Source:
- [curex-be/services/payment-service/src/main/java/com/curex/payment/controller/InternalUserDataController.java](curex-be/services/payment-service/src/main/java/com/curex/payment/controller/InternalUserDataController.java)

## 5. Authentication and authorization journey

### 5.1 Gateway responsibilities
Authentication is performed centrally in gateway global filter:
- Removes any client-injected identity headers
- Validates Bearer JWT on non-public routes
- Injects trusted headers into forwarded request:
  - X-User-Id
  - X-User-Role
  - X-User-Email

Source:
- [curex-be/api-gateway/src/main/java/com/curex/gateway/filter/AuthenticationFilter.java](curex-be/api-gateway/src/main/java/com/curex/gateway/filter/AuthenticationFilter.java)

### 5.2 Public route exception
- /api/payments/webhook is explicitly public at gateway
- This allows Stripe to call webhook without JWT

Source:
- [curex-be/api-gateway/src/main/java/com/curex/gateway/filter/AuthenticationFilter.java](curex-be/api-gateway/src/main/java/com/curex/gateway/filter/AuthenticationFilter.java)

### 5.3 Service-side role checks
PaymentController enforces:
- listPayments: patient self-access or admin
- listAdminPayments: admin only

Source:
- [curex-be/services/payment-service/src/main/java/com/curex/payment/controller/PaymentController.java](curex-be/services/payment-service/src/main/java/com/curex/payment/controller/PaymentController.java)

## 6. Detailed patient payment journey

### 6.1 User books appointment first
The appointment flow creates a booking that remains pending confirmation until payment success.
Frontend message explicitly says appointment will be confirmed after payment.

Source:
- [curex-fe/src/pages/patient/PatientAppointments.tsx](curex-fe/src/pages/patient/PatientAppointments.tsx)

### 6.2 User enters checkout page
Route:
- /patient/checkout/:appointmentId

Frontend action:
- Loads patient appointments and finds selected appointment
- Shows fixed demo consultation amount ($50.00) in UI

Source:
- [curex-fe/src/pages/patient/PatientCheckout.tsx](curex-fe/src/pages/patient/PatientCheckout.tsx)

### 6.3 Frontend creates checkout session
On Confirm and Pay:
1. Builds successUrl:
   - /patient/appointments?payment=success&id={appointmentId}
2. Builds cancelUrl:
   - /patient/checkout/{appointmentId}?payment=cancelled
3. Calls POST /api/payments/appointments/{appointmentId}
4. Retries up to 3 times for retryable HTTP conditions (405/502/503/504 and method mismatch message)
5. Stores pending payment metadata in sessionStorage key curex.pendingPayment
6. Redirects browser to Stripe checkoutUrl

Source:
- [curex-fe/src/pages/patient/PatientCheckout.tsx](curex-fe/src/pages/patient/PatientCheckout.tsx)
- [curex-fe/src/services/paymentService.ts](curex-fe/src/services/paymentService.ts)

### 6.4 Payment service creates local payment + Stripe session
Backend flow for createPaymentForAppointment:
1. Validate appointmentId
2. Create local payment row with:
   - status=PENDING
   - paymentMethod=STRIPE_CHECKOUT
3. Save row to get UUID
4. Create Stripe Checkout Session
5. Save stripeSessionId in row
6. Return StripeCheckoutResponse with checkoutUrl

Source:
- [curex-be/services/payment-service/src/main/java/com/curex/payment/service/PaymentServiceImpl.java](curex-be/services/payment-service/src/main/java/com/curex/payment/service/PaymentServiceImpl.java)

### 6.5 Stripe checkout session construction details
Important Stripe details:
- Requires STRIPE_SECRET_KEY
- Currency normalized to lowercase
- Handles zero-decimal currencies correctly for unit amount conversion
- Appends session_id={CHECKOUT_SESSION_ID} to success URL if missing
- Adds metadata for correlation:
  - paymentId
  - appointmentId
  - patientId

Source:
- [curex-be/services/payment-service/src/main/java/com/curex/payment/service/StripeServiceImpl.java](curex-be/services/payment-service/src/main/java/com/curex/payment/service/StripeServiceImpl.java)

### 6.6 Webhook processing
Webhook endpoint requirements:
- Raw payload body is read directly from request stream
- Stripe-Signature header is required
- Signature validated with STRIPE_WEBHOOK_SECRET

Supported event types:
1. checkout.session.completed
- Finds payment by stripeSessionId
- Idempotency guard: if already SUCCESS, skip duplicate processing
- Sets status=SUCCESS
- Sets stripePaymentIntentId from session
- Sets paymentMethod=CARD
- Saves payment
- Publishes PaymentConfirmedEvent to RabbitMQ

2. checkout.session.expired
- Finds payment by stripeSessionId
- Sets status=CANCELLED

Source:
- [curex-be/services/payment-service/src/main/java/com/curex/payment/controller/PaymentController.java](curex-be/services/payment-service/src/main/java/com/curex/payment/controller/PaymentController.java)
- [curex-be/services/payment-service/src/main/java/com/curex/payment/service/PaymentServiceImpl.java](curex-be/services/payment-service/src/main/java/com/curex/payment/service/PaymentServiceImpl.java)
- [curex-be/services/payment-service/src/main/java/com/curex/payment/service/StripeServiceImpl.java](curex-be/services/payment-service/src/main/java/com/curex/payment/service/StripeServiceImpl.java)

### 6.7 Frontend return handling after Stripe redirect
PatientAppointments page reads query params:
- payment=success
- payment=cancelled

On success:
1. Toast success message
2. Polls up to 8 times with 1.5s interval
3. Refreshes appointments and stops polling if payment is observed completed
4. Removes sessionStorage curex.pendingPayment
5. Navigates cleanly back to /patient/appointments

On cancelled:
- Shows warning toast and returns to appointments

Source:
- [curex-fe/src/pages/patient/PatientAppointments.tsx](curex-fe/src/pages/patient/PatientAppointments.tsx)

## 7. Downstream effects after successful payment

### 7.1 Appointment service confirmation
Appointment service consumes payment.confirmed and updates appointment:
- status -> CONFIRMED
- paymentId set from event

Source:
- [curex-be/services/appointment/appointment-service/src/main/java/com/healthcare/appointment/service/AppointmentService.java](curex-be/services/appointment/appointment-service/src/main/java/com/healthcare/appointment/service/AppointmentService.java)

### 7.2 Notification service flow
Payment service also publishes payment confirmation to notification exchange/routing key:
- exchange: payment.exchange
- routing key: payment.confirmation

Notification service consumes payment.confirmation.queue and creates/sends confirmation notification.

Source:
- [curex-be/services/payment-service/src/main/java/com/curex/payment/event/PaymentEventPublisher.java](curex-be/services/payment-service/src/main/java/com/curex/payment/event/PaymentEventPublisher.java)
- [curex-be/services/notification-service/src/main/java/com/curex/notification/consumer/NotificationEventConsumer.java](curex-be/services/notification-service/src/main/java/com/curex/notification/consumer/NotificationEventConsumer.java)

## 8. Admin and patient history journeys

### 8.1 Patient history
PatientPayments page:
- calls GET /api/payments/patients/{patientId}
- shows status badges and modal details
- can fetch latest payment by ID for details modal

Source:
- [curex-fe/src/pages/patient/PatientPayments.tsx](curex-fe/src/pages/patient/PatientPayments.tsx)

### 8.2 Admin monitoring
AdminPayments page:
- primary: calls GET /api/payments/admin
- fallback: if endpoint unavailable (404/405/501), reconstructs data from:
  - appointments list
  - payment-by-id
  - per-patient payment lists
- computes KPIs (total, pending, success, failed, collected)

Source:
- [curex-fe/src/pages/admin/AdminPayments.tsx](curex-fe/src/pages/admin/AdminPayments.tsx)

## 9. Messaging contracts

### 9.1 payment.confirmed
Published when Stripe checkout is completed and payment row is marked SUCCESS.

Publisher setup:
- exchange: healthcare.exchange
- routing key: payment.confirmed
- queue: payment.confirmed.queue

Source:
- [curex-be/services/payment-service/src/main/java/com/curex/payment/config/RabbitMQConfig.java](curex-be/services/payment-service/src/main/java/com/curex/payment/config/RabbitMQConfig.java)

### 9.2 payment.confirmation
Also published for notification-service compatibility.

Publisher setup:
- exchange: payment.exchange
- routing key: payment.confirmation

Source:
- [curex-be/services/payment-service/src/main/java/com/curex/payment/event/PaymentEventPublisher.java](curex-be/services/payment-service/src/main/java/com/curex/payment/event/PaymentEventPublisher.java)

## 10. Environment and runtime configuration

### 10.1 Payment service properties
Core properties:
- stripe.secret-key
- stripe.webhook-secret
- stripe.success-url
- stripe.cancel-url
- spring datasource and rabbit settings

Source:
- [curex-be/services/payment-service/src/main/resources/application.properties](curex-be/services/payment-service/src/main/resources/application.properties)

### 10.2 Docker Compose wiring
Payment service container receives:
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_SUCCESS_URL
- STRIPE_CANCEL_URL
- datasource and rabbit vars

Source:
- [docker-compose.yml](docker-compose.yml)

## 11. Known behavior and implementation notes

1. PENDING is created before Stripe session creation
- Good for observability and traceability
- Means abandoned checkout may leave PENDING row

2. SUCCESS is webhook-driven
- Redirect alone does not finalize payment
- Final state depends on webhook delivery and verification

3. Idempotency is partially handled
- checkout.session.completed duplicate retries do not republish once already SUCCESS

4. Amount source currently demo-fixed in UI
- PatientCheckout sends amount=50.0
- Not dynamically derived from doctor fee/pricing yet

5. Frontend supports COMPLETED badge
- Backend status enum does not define COMPLETED
- UI keeps it for backward/compat fallback tolerance

6. Webhook is intentionally no-auth at gateway
- Security still enforced by Stripe signature verification

## 12. Sequence summary

1. Patient books appointment -> appointment is pending confirmation.
2. Patient opens checkout page and clicks Confirm and Pay.
3. Frontend POSTs create checkout request via gateway.
4. Payment service stores PENDING payment and creates Stripe session.
5. Frontend redirects to Stripe-hosted checkout URL.
6. Stripe sends webhook checkout.session.completed (or expired).
7. Payment service verifies signature, updates status.
8. On success, payment service publishes events.
9. Appointment service marks appointment CONFIRMED and sets paymentId.
10. Notification service sends/stores payment confirmation notification.
11. Patient returns to appointments page; frontend polls and refreshes state.

## 13. Practical debugging checklist

1. Build and runtime
- Ensure payment-service is healthy on 8087 and gateway on 8080.

2. Stripe config
- STRIPE_SECRET_KEY must be set for creating sessions.
- STRIPE_WEBHOOK_SECRET must match Stripe CLI/dashboard secret.

3. Gateway auth
- For non-webhook routes, JWT must be valid.
- Check gateway injects X-User-Id and X-User-Role.

4. Webhook delivery
- Verify Stripe can reach /api/payments/webhook.
- Confirm signature header is present.

5. Database correlation
- payment.stripeSessionId should match Stripe session id.
- On completion, status should become SUCCESS and payment intent should be filled.

6. Event propagation
- Check payment.confirmed.queue consumers in appointment-service.
- Check payment.confirmation.queue consumer in notification-service.

7. Frontend return flow
- Confirm successUrl/cancelUrl paths match frontend router expectations.

## 14. Suggested future hardening

1. Introduce explicit FAILED transitions for relevant Stripe events.
2. Add dead-letter strategy for webhook/event processing failures.
3. Replace fixed frontend amount with server-authoritative pricing.
4. Add reconciliation job for stale PENDING payments.
5. Add integration tests for full webhook->event->appointment confirmation chain.
