#!/bin/sh
# Container entry. Every command checks its environment first and
# refuses weak or default secrets (deploy/check-env.mjs).
#
#   serve         serve only, as the runtime role (deploy/serve.ts)
#   migrate       apply migrations as the owner role and exit
#   main          packages/api main.ts: migrate, then serve (needs both
#                 URLs; for single-container setups only)
#   verify-audit  recompute every audit hash chain (read-only)
#   check-env     only run the environment check for `serve`
set -eu

cd /app

case "${1:-serve}" in
  serve)
    node deploy/check-env.mjs --target serve
    exec node --import tsx deploy/serve.ts
    ;;
  migrate)
    node deploy/check-env.mjs --target migrate
    exec node --import tsx packages/api/src/main.ts migrate
    ;;
  main)
    node deploy/check-env.mjs --target api
    exec node --import tsx packages/api/src/main.ts
    ;;
  verify-audit)
    shift
    node deploy/check-env.mjs --target verify
    exec node --import tsx deploy/verify-audit-chain.ts "$@"
    ;;
  check-env)
    exec node deploy/check-env.mjs --target serve
    ;;
  *)
    echo "usage: serve | migrate | main | verify-audit [companyId...]" \
      "| check-env" >&2
    exit 2
    ;;
esac
