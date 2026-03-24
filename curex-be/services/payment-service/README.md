# payment-service

Spring Boot microservice for handling appointment payments using **Stripe (test mode)**.

- Port: `8087`
- DB: PostgreSQL (JPA/Hibernate)
- Messaging: RabbitMQ (publishes `payment.confirmed` events)
- Payments: Stripe Checkout Session + webhook verification

## Configuration

The service reads most settings from environment variables (with defaults where safe).

### Required

- `STRIPE_SECRET_KEY` — your Stripe **test** secret key (`sk_test_...`)
- `STRIPE_WEBHOOK_SECRET` — webhook signing secret (`whsec_...`) from Stripe CLI or Dashboard

### Common (local/dev)

- `DB_HOST` (default `localhost`)
- `DB_PORT` (default `5436`)
- `DB_NAME` (default `payment_db`)
- `DB_USER` (default `postgres`)
- `DB_PASSWORD` (default `rasanga`)

- `RABBIT_HOST` (default `localhost`)
- `RABBIT_PORT` (default `5672`)
- `RABBIT_USER` (default `guest`)
- `RABBIT_PASSWORD` (default `guest`)

- `STRIPE_SUCCESS_URL` (default `http://localhost:5173/payment/success`)
- `STRIPE_CANCEL_URL` (default `http://localhost:5173/payment/cancel`)

## Run locally (Docker + Maven)

### 1) Start PostgreSQL

This matches the default `DB_PORT=5436` in `application.properties`.

```powershell
docker run -d --name curex-payment-postgres `
  -e POSTGRES_DB=payment_db `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=rasanga `
  -p 5436:5432 `
  postgres:16
```

### 2) Start RabbitMQ (with Management UI)

```powershell
docker run -d --name curex-rabbitmq `
  -p 5672:5672 `
  -p 15672:15672 `
  rabbitmq:3-management
```

- Management UI: `http://localhost:15672` (user/pass: `guest` / `guest`)
- Queue declared by this service on startup: `payment.confirmed.queue`

### 3) Run the service

From this folder:

```powershell
mvn -DskipTests spring-boot:run
```

Service should start at: `http://localhost:8087`

## Stripe webhook (local testing)

### Option A: Stripe CLI (recommended)

1. Install + login (one-time):

```powershell
stripe login
```

2. Forward events to the service:

```powershell
stripe listen --forward-to http://localhost:8087/payments/webhook
```

Copy the printed `whsec_...` value and set it as `STRIPE_WEBHOOK_SECRET`.

3. Trigger a full flow:

- Call the “create checkout” endpoint (below) to get a `checkoutUrl`.
- Open the `checkoutUrl` in a browser.
- Pay using a test card: `4242 4242 4242 4242` (any future expiry, any CVC).

When payment succeeds, Stripe sends `checkout.session.completed` to the webhook.

## API examples

### Create Checkout Session

```powershell
curl.exe -X POST "http://localhost:8087/payments/appointments/APPT-123" -H "Content-Type: application/json" -d "{\"patientId\":\"PAT-001\",\"amount\":2500.00,\"currency\":\"lkr\"}"
```

Response contains:

- `paymentId` (UUID)
- `checkoutUrl` (open in browser)
- `stripeSessionId`

### Get payment by id

```powershell
curl.exe "http://localhost:8087/payments/{paymentId}"
```

### List payments for a patient

```powershell
curl.exe "http://localhost:8087/patients/PAT-001/payments"
```

## RabbitMQ event published on success

On `checkout.session.completed` the service updates the payment to `SUCCESS` and publishes a JSON message:

- Exchange: `healthcare.exchange`
- Routing key: `payment.confirmed`
- Queue: `payment.confirmed.queue`

Payload (see `PaymentConfirmedEvent`):

- `paymentId`, `appointmentId`, `patientId`, `amount`, `currency`, `status`, `timestamp`
