-- Run after doctor/patient data is fully backfilled to their respective services.
-- This migration removes role-specific attributes from user-service's users table.

ALTER TABLE users DROP COLUMN IF EXISTS specialty;
ALTER TABLE users DROP COLUMN IF EXISTS medical_license_number;
ALTER TABLE users DROP COLUMN IF EXISTS years_of_experience;
ALTER TABLE users DROP COLUMN IF EXISTS certifications;
ALTER TABLE users DROP COLUMN IF EXISTS proof_document_urls;
ALTER TABLE users DROP COLUMN IF EXISTS blood_group;
ALTER TABLE users DROP COLUMN IF EXISTS allergies;
ALTER TABLE users DROP COLUMN IF EXISTS chronic_conditions;
ALTER TABLE users DROP COLUMN IF EXISTS emergency_contact_name;
ALTER TABLE users DROP COLUMN IF EXISTS emergency_contact_phone;
