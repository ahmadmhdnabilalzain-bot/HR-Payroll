-- Data-protection review M-9 (2026-11-26): leave reasons and decision
-- notes can be health data, so they are sealed with the company key.
-- Clear values written before this migration are dropped (no real data).

ALTER TABLE leave_requests ADD COLUMN reason_enc text;
ALTER TABLE leave_requests ADD COLUMN decision_note_enc text;
ALTER TABLE leave_requests DROP COLUMN reason;
ALTER TABLE leave_requests DROP COLUMN decision_note;
