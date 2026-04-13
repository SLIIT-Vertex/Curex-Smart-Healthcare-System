-- Phase 2: doctor-service identity hardening
-- Purpose:
-- 1) Keep doctor-service as role-domain owner while treating user-service as canonical identity source.
-- 2) Enforce stable linkage and query performance for user_id-based synchronization.

-- Ensure user_id is mandatory for cross-service identity sync.
ALTER TABLE doctors ALTER COLUMN user_id SET NOT NULL;

-- Ensure deterministic lookups for sync and read paths.
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors (user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_email ON doctors (email);

-- Keep uniqueness constraints idempotent across environments.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_doctors_user_id'
    ) THEN
        ALTER TABLE doctors
            ADD CONSTRAINT uq_doctors_user_id UNIQUE (user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_doctors_email'
    ) THEN
        ALTER TABLE doctors
            ADD CONSTRAINT uq_doctors_email UNIQUE (email);
    END IF;
END $$;
