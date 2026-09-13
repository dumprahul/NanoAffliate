-- Backs real creator login via World ID Selfie Check (frontend/app/login).
-- The nullifier is World's stable per-app identifier for a verified human —
-- looking a creator up by it means the same person logging in from a new
-- browser/device lands on the same creator row, unlike the old
-- localStorage-only identity.

alter table creators
  add column world_nullifier text unique;
