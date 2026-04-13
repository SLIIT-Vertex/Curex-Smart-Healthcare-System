-- Phase 2: patient-service identity hardening
-- Purpose:
-- 1) Keep patient-service as role-domain owner while treating user-service as canonical identity source.
-- 2) Enforce stable linkage and query performance for user_id-based synchronization.

-- If your runtime DB migration tool supports it, enforce NOT NULL as a manual step:
-- ALTER TABLE patients ALTER COLUMN user_id SET NOT NULL;

-- Ensure deterministic lookups for sync and read paths.
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients (user_id);
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients (email);

-- Keep uniqueness constraints idempotent across environments.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_patients_user_id'
    ) THEN
        ALTER TABLE patients
            ADD CONSTRAINT uq_patients_user_id UNIQUE (user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_patients_email'
    ) THEN
        ALTER TABLE patients
            ADD CONSTRAINT uq_patients_email UNIQUE (email);
    END IF;
END $$;
