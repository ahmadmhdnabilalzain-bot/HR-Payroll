# syntax=docker/dockerfile:1
#
# Payroll API image. Build from the repository root:
#   docker build -f deploy/Dockerfile -t payroll-api .
#
# The API runs from TypeScript source through tsx, exactly as
# `pnpm api:dev` does (the workspace packages export ./src/*.ts and the
# migrations are found relative to the source). There is no compile
# step yet; see docs/ops/ops-kit-report.md.

ARG NODE_IMAGE=node:22-bookworm-slim
# The pnpm version the lockfile was written with. The root package.json
# has no packageManager field, so it is pinned here and in CI.
ARG PNPM_VERSION=10.28.0

# ---- deps: install the API's workspace closure from the lockfile ----
FROM ${NODE_IMAGE} AS deps
ARG PNPM_VERSION
ENV CI=true COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare "pnpm@${PNPM_VERSION}" --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json packages/api/
COPY packages/contract/package.json packages/contract/
COPY packages/engine/package.json packages/engine/
COPY packages/wps/package.json packages/wps/
COPY apps/web/package.json apps/web/
# The root (tsx) and the API with its workspace dependencies only; the
# web app is not installed. Dev dependencies stay because tsx is one.
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm \
    pnpm install --frozen-lockfile --ignore-scripts \
      --filter hr-payroll --filter "@payroll/api..."
RUN test -e node_modules/tsx/package.json

# ---- runtime ----
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production PORT=8787
WORKDIR /app
# Code and modules belong to root and are read-only for the app user.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY package.json tsconfig.base.json ./
COPY packages/api/src packages/api/src
COPY packages/api/migrations packages/api/migrations
COPY packages/api/tsconfig.json packages/api/
COPY packages/contract/src packages/contract/src
COPY packages/engine/src packages/engine/src
COPY packages/wps/src packages/wps/src
COPY deploy/check-env.mjs deploy/serve.ts deploy/verify-audit-chain.ts \
  deploy/
COPY --chmod=0755 deploy/entrypoint.sh deploy/
USER node
EXPOSE 8787
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT \
|| 8787) + '/v1/health').then((r) => process.exit(r.ok ? 0 : 1), \
() => process.exit(1))"]
ENTRYPOINT ["/app/deploy/entrypoint.sh"]
CMD ["serve"]
