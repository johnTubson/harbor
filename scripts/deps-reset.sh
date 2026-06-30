#!/usr/bin/env bash
# Last resort only — prefer `pnpm deps` first.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Removing workspace node_modules…"
rm -rf node_modules
rm -rf apps/*/node_modules packages/*/node_modules 2>/dev/null || true

exec "$(dirname "$0")/deps.sh" "$@"
