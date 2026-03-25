-- 
-- Curex Healthcare Platform — Database Initialisation
-- Runs once on first Postgres container start (via docker-entrypoint-initdb.d).
-- 

-- ── Per-service databases ────────────────────────────────────────────────────
-- Each service owns its database (microservice data-ownership principle).
-- Databases in use (verified against docker-compose.yml SPRING_DATASOURCE_URL):
--   curex_users         ← user-service
--   curex_notifications ← notification-service
--   curex_appointments  ← appointment-service
--   curex_patients      ← patient-service
--   curex_doctors       ← doctor-service
--   curex_telemed       ← telemedicine-service
-- Future services: add a CREATE DATABASE + GRANT + schema block below.

CREATE DATABASE curex_users;
CREATE DATABASE curex_notifications;
CREATE DATABASE curex_appointments;
CREATE DATABASE curex_patients;
CREATE DATABASE curex_doctors;
CREATE DATABASE curex_telemed;

-- ── Privileges ───────────────────────────────────────────────────────────────
GRANT ALL PRIVILEGES ON DATABASE curex_users         TO curex_user;
GRANT ALL PRIVILEGES ON DATABASE curex_notifications TO curex_user;
GRANT ALL PRIVILEGES ON DATABASE curex_appointments  TO curex_user;
GRANT ALL PRIVILEGES ON DATABASE curex_patients      TO curex_user;
GRANT ALL PRIVILEGES ON DATABASE curex_doctors       TO curex_user;
GRANT ALL PRIVILEGES ON DATABASE curex_telemed       TO curex_user;

-- ── Extensions + schema grants per database ──────────────────────────────────
-- uuid-ossp    — used for UUID primary keys
-- Schema GRANT — required for Hibernate DDL (CREATE TABLE etc.) in Postgres 15+

\c curex_users;
GRANT ALL ON SCHEMA public TO curex_user;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c curex_notifications;
GRANT ALL ON SCHEMA public TO curex_user;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- NOTE: Hibernate creates the notifications table + type CHECK constraint at
-- first boot from the NotificationType enum. If you add a new enum value and
-- the container volume already exists (ddl-auto=update), run:
--   docker exec curex-postgres psql -U curex_user -d curex_notifications -c \
--   "ALTER TABLE notifications DROP CONSTRAINT notifications_type_check; \
--    ALTER TABLE notifications ADD CONSTRAINT notifications_type_check \
--    CHECK (type IN ('WELCOME','EMAIL_VERIFICATION','OTP_VERIFICATION', \
--    'PASSWORD_RESET','APPOINTMENT_CONFIRMATION','APPOINTMENT_REMINDER', \
--    'APPOINTMENT_CANCELLATION','DOCTOR_APPROVAL','DOCTOR_REJECTION', \
--    'PAYMENT_CONFIRMATION','PRESCRIPTION_READY','CONSULTATION_REMINDER', \
--    'SYSTEM_ALERT'));"
-- On a fresh volume, Hibernate re-generates the constraint correctly from the enum.

\c curex_appointments;
GRANT ALL ON SCHEMA public TO curex_user;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c curex_patients;
GRANT ALL ON SCHEMA public TO curex_user;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c curex_doctors;
GRANT ALL ON SCHEMA public TO curex_user;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c curex_telemed;
GRANT ALL ON SCHEMA public TO curex_user;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Application seed data ────────────────────────────────────────────────────
-- Handled by DataSeeder.java inside user-service.
-- Runs on first boot and creates the default admin user:
--   Email    : admin@curex.com
--   Password : Admin@Curex2024   ← CHANGE IMMEDIATELY AFTER FIRST LOGIN

\echo 'Curex database initialisation complete.';
