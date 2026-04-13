-- Phase 2: doctor-service identity hardening
-- Purpose:
-- 1) Keep doctor-service as role-domain owner while treating user-service as canonical identity source.
-- 2) Enforce stable linkage and query performance for user_id-based synchronization.

-- If your runtime DB migration tool supports it, enforce NOT NULL as a manual step:
-- ALTER TABLE doctors ALTER COLUMN user_id SET NOT NULL;

-- Ensure deterministic lookups for sync and read paths.
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors (user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_email ON doctors (email);

-- Enforce uniqueness constraints.
ALTER TABLE doctors ADD CONSTRAINT uq_doctors_user_id UNIQUE (user_id);
ALTER TABLE doctors ADD CONSTRAINT uq_doctors_email UNIQUE (email);
