-- A TOTP code is accepted once: the last accepted 30-second step is
-- kept per user and only later steps are accepted.

ALTER TABLE users ADD COLUMN mfa_last_step bigint;
