#!/usr/bin/env bash
# Non-interactive install. Always use: pnpm deps
set -euo pipefail
cd "$(dirname "$0")/.."

# CI=true makes pnpm use --frozen-lockfile and fail when the lockfile is stale.
unset CI

export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

exec pnpm install --no-frozen-lockfile "$@"
