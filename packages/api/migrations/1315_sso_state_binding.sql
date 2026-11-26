-- Review M2 (login CSRF): the start returns a random browser-binding
-- value that the app keeps (sessionStorage) and sends back with the
-- callback; only its hash is stored. sso_states is global (no RLS);
-- rows from before this migration have none and so cannot complete.
ALTER TABLE sso_states ADD COLUMN binding_hash text;
