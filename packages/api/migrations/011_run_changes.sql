-- Money review (SIF risk) and data-protection review I-1 (2026-11-26):
-- a pay run records who changed since the last approved run (employee
-- ids and field names only), and a SIF file records whose live bank
-- details differ from the approved run's (ids only).

ALTER TABLE pay_runs ADD COLUMN changes jsonb NOT NULL DEFAULT '[]';
ALTER TABLE sif_files ADD COLUMN bank_drift jsonb NOT NULL DEFAULT '[]';
