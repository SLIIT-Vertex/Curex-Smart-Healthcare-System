-- 
-- Curex Healthcare Platform — Database Initialisation
-- Runs once on first Postgres container start (via docker-entrypoint-initdb.d).
-- 

--  Per-service databases 
-- Each service owns its database (microservice data-ownership principle).
-- Future services: add a CREATE DATABASE + GRANT block below.

CREATE DATABASE curex_users;
CREATE DATABASE curex_notifications;
CREATE DATABASE curex_appointments;
CREATE DATABASE curex_patients;
CREATE DATABASE curex_doctors;
CREATE DATABASE curex_payments;
CREATE DATABASE curex_reports;
CREATE DATABASE curex_telemed;

--  Privileges 
GRANT ALL PRIVILEGES ON DATABASE curex_users         TO curex_user;
GRANT ALL PRIVILEGES ON DATABASE curex_notifications TO curex_user;
GRANT ALL PRIVILEGES ON DATABASE curex_appointments  TO curex_user;
GRANT ALL PRIVILEGES ON DATABASE curex_patients      TO curex_user;
GRANT ALL PRIVILEGES ON DATABASE curex_doctors       TO curex_user;
GRANT ALL PRIVILEGES ON DATABASE curex_payments      TO curex_user;
GRANT ALL PRIVILEGES ON DATABASE curex_reports       TO curex_user;
GRANT ALL PRIVILEGES ON DATABASE curex_telemed       TO curex_user;

--  Extensions + schema grants per database 
-- uuid-ossp      — used for UUID primary keys
-- Schema GRANT   — required for Hibernate DDL (CREATE TABLE etc.) in Postgres 15+

\c curex_users;
GRANT ALL ON SCHEMA public TO curex_user;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c curex_notifications;
GRANT ALL ON SCHEMA public TO curex_user;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c curex_appointments;
GRANT ALL ON SCHEMA public TO curex_user;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c curex_patients;
GRANT ALL ON SCHEMA public TO curex_user;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c curex_doctors;
GRANT ALL ON SCHEMA public TO curex_user;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c curex_payments;
GRANT ALL ON SCHEMA public TO curex_user;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c curex_reports;
GRANT ALL ON SCHEMA public TO curex_user;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c curex_telemed;
GRANT ALL ON SCHEMA public TO curex_user;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Application seed data is handled by DataSeeder.java inside user-service.
-- It runs on first boot and creates the default admin user:
--   Email    : admin@curex.com
--   Password : Admin@Curex2024   ← CHANGE IMMEDIATELY AFTER FIRST LOGIN
-- 

\echo 'Curex database initialisation complete.';
