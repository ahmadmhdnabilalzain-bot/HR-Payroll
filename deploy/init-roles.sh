#!/bin/sh
# Runs deploy/init-roles.sql inside the official postgres image on the
# first start of an empty data directory (/docker-entrypoint-initdb.d).
# A .sql file there gets no psql variables, hence this wrapper. The
# passwords come from the container environment and are never echoed.
set -eu

: "${PAYROLL_OWNER_PASSWORD:?PAYROLL_OWNER_PASSWORD is required}"
: "${PAYROLL_RUNTIME_PASSWORD:?PAYROLL_RUNTIME_PASSWORD is required}"
: "${PAYROLL_BACKUP_PASSWORD:?PAYROLL_BACKUP_PASSWORD is required}"

psql -v ON_ERROR_STOP=1 --no-psqlrc \
  --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v owner_password="$PAYROLL_OWNER_PASSWORD" \
  -v runtime_password="$PAYROLL_RUNTIME_PASSWORD" \
  -v backup_password="$PAYROLL_BACKUP_PASSWORD" \
  -f /payroll/init-roles.sql
