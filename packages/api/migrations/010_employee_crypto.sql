-- Data-protection review fixes (2026-11-26): the routing code is
-- sealed with the IBAN (one value, versioned like the salary), so a
-- database writer cannot change it alone or make the shown last four
-- digits disagree with the real IBAN. Cipher text written before this
-- migration under the old AAD cannot be read; there was no real data.

ALTER TABLE employees ADD COLUMN bank_version integer NOT NULL DEFAULT 0;
ALTER TABLE employees DROP COLUMN bank_routing;
ALTER TABLE employees DROP COLUMN iban_last4;
