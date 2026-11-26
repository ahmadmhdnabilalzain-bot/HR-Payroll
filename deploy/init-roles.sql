-- Database roles for the payroll API. Run once per database as a
-- superuser, with psql variables for the passwords:
--
--   psql -v ON_ERROR_STOP=1 -d payroll \
--     -v owner_password="$PAYROLL_OWNER_PASSWORD" \
--     -v runtime_password="$PAYROLL_RUNTIME_PASSWORD" \
--     -v backup_password="$PAYROLL_BACKUP_PASSWORD" \
--     -f deploy/init-roles.sql
--
-- Safe to run again: missing roles are created, passwords are reset to
-- the values given, grants are re-applied.
--
-- payroll_owner   owns the database, the public schema and every table;
--                 runs migrations. Not a superuser, cannot create roles.
-- payroll_runtime the API's login. No superuser, no BYPASSRLS, owns
--                 nothing, no schema usage of its own. It may only
--                 SET ROLE payroll_app (INHERIT FALSE, SET TRUE).
-- payroll_app     NOLOGIN, NOBYPASSRLS. Holds the table grants the
--                 migrations give; row-level security applies to it.
-- payroll_backup  read-only login for pg_dump and the audit chain
--                 check: pg_read_all_data plus BYPASSRLS, because the
--                 tables FORCE row-level security and pg_dump refuses
--                 to dump a table its role cannot read in full.

\set ON_ERROR_STOP on

SELECT format('CREATE ROLE payroll_owner LOGIN')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'payroll_owner')
\gexec
SELECT format('CREATE ROLE payroll_runtime LOGIN')
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = 'payroll_runtime')
\gexec
SELECT format('CREATE ROLE payroll_backup LOGIN')
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = 'payroll_backup')
\gexec
-- Migration 001 creates payroll_app when it is missing; creating it
-- here lets the grant below exist before the API first starts, and
-- spares the owner the CREATEROLE attribute.
SELECT format('CREATE ROLE payroll_app NOLOGIN')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'payroll_app')
\gexec

-- Attributes are re-stated on every run, so a drifted role is fixed.
ALTER ROLE payroll_owner LOGIN NOSUPERUSER NOCREATEROLE NOCREATEDB
  NOBYPASSRLS NOREPLICATION PASSWORD :'owner_password';
ALTER ROLE payroll_runtime LOGIN NOSUPERUSER NOCREATEROLE NOCREATEDB
  NOBYPASSRLS NOREPLICATION PASSWORD :'runtime_password';
ALTER ROLE payroll_backup LOGIN NOSUPERUSER NOCREATEROLE NOCREATEDB
  BYPASSRLS NOREPLICATION PASSWORD :'backup_password';
ALTER ROLE payroll_app NOLOGIN NOSUPERUSER NOCREATEROLE NOCREATEDB
  NOBYPASSRLS NOREPLICATION;

-- PostgreSQL 16: SET TRUE allows SET ROLE payroll_app; INHERIT FALSE
-- means the runtime login holds none of payroll_app's grants outside
-- that SET ROLE (the API does it per transaction in withTenant).
GRANT payroll_app TO payroll_runtime WITH INHERIT FALSE, SET TRUE;
GRANT pg_read_all_data TO payroll_backup;

-- The owner owns the database and its public schema. Nobody else may
-- connect, create objects or use the schema unless granted.
SELECT format('ALTER DATABASE %I OWNER TO payroll_owner',
  current_database())
\gexec
SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', current_database())
\gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO payroll_runtime, '
  'payroll_backup', current_database())
\gexec
ALTER SCHEMA public OWNER TO payroll_owner;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO payroll_backup;
