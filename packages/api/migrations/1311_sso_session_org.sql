-- Security review I3: an SSO session records which organisation the
-- identity came from ("hd:<google hosted domain>" or "tid:<microsoft
-- tenant id>", null when the identity has none), so enforcement can
-- require the company's own domain or tenant. sessions is global (no
-- RLS); existing rows keep null, which no enforced company accepts.
ALTER TABLE sessions ADD COLUMN sso_org text;
