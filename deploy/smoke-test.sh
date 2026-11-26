#!/bin/sh
# Smoke test against a running API (for example the compose stack):
# health, a signup (a real write through row-level security as the
# runtime role), a tenant write, and the audit chain check over HTTP.
# Uses throwaway demo values only; run it against an empty test stack,
# never production (it creates a company).
#
#   deploy/smoke-test.sh http://127.0.0.1:8787
set -eu

BASE="${1:-http://127.0.0.1:8787}/v1"
JSON="content-type: application/json"
STAMP="$(date +%s)$$"

fail() {
  echo "smoke: FAIL $1" >&2
  exit 1
}

field() {
  # field <json> <js expression on o>
  node -e "const o = JSON.parse(process.argv[1]); \
process.stdout.write(String($2))" "$1"
}

health="$(curl -fsS "$BASE/health")" || fail "health"
[ "$(field "$health" o.status)" = ok ] || fail "health body"
echo "smoke: health ok"

signup="$(curl -fsS -X POST "$BASE/signup" -H "$JSON" -d "{
  \"companyName\": \"Smoke Test Co $STAMP\",
  \"email\": \"smoke-$STAMP@example.test\",
  \"password\": \"smoke-test-passphrase-$STAMP\",
  \"displayName\": \"Smoke Tester\"}")" || fail "signup"
token="$(field "$signup" o.token)"
company="$(field "$signup" o.memberships[0].companyId)"
echo "smoke: signup ok"

auth="authorization: Bearer $token"
tenant="x-company-id: $company"
curl -fsS -X POST "$BASE/departments" -H "$auth" -H "$tenant" \
  -H "$JSON" -d '{"name": "Operations"}' >/dev/null \
  || fail "create department"
echo "smoke: tenant write ok"

verify="$(curl -fsS "$BASE/audit-events/verify" -H "$auth" \
  -H "$tenant")" || fail "audit verify"
[ "$(field "$verify" o.ok)" = true ] || fail "audit chain not ok"
echo "smoke: audit chain ok ($(field "$verify" o.checked) events)"

other="$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/departments" \
  -H "$auth" -H "x-company-id: 00000000-0000-4000-8000-000000000000")"
case "$other" in
  2*) fail "another company's id was accepted ($other)" ;;
esac
echo "smoke: foreign company refused ($other)"
echo "smoke: PASS"
