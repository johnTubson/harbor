#!/usr/bin/env bash
# Start API + admin + merchant for Playwright e2e (loads repo-root .env).
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:${PORT:-4000}}"
export PORT="${PORT:-4000}"
export ADMIN_PORT="${ADMIN_PORT:-3011}"
export MERCHANT_PORT="${MERCHANT_PORT:-3012}"

cleanup() {
  for pid in "${API_PID:-}" "${ADMIN_PID:-}" "${MERCHANT_PID:-}"; do
    if [ -n "${pid}" ] && kill -0 "${pid}" 2>/dev/null; then
      kill "${pid}" 2>/dev/null || true
    fi
  done
}
trap cleanup EXIT INT TERM

NODE_ENV=development pnpm --filter @harbor/api start &
API_PID=$!

NODE_ENV=production NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
  pnpm --filter @harbor/admin start &
ADMIN_PID=$!

NODE_ENV=production NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
  pnpm --filter @harbor/merchant start &
MERCHANT_PID=$!

wait_for() {
  local url=$1
  local label=$2
  for _ in $(seq 1 120); do
    if curl -sf "$url" >/dev/null 2>&1; then
      echo "e2e: ${label} ready at ${url}"
      return 0
    fi
    sleep 1
  done
  echo "e2e: timed out waiting for ${label} (${url})" >&2
  return 1
}

wait_for "http://localhost:${PORT}/health" "api"
wait_for "http://localhost:${ADMIN_PORT}/login" "admin"
wait_for "http://localhost:${MERCHANT_PORT}/login" "merchant"

echo "e2e: all services up"
wait
