#!/usr/bin/env bash
# Saari browser suites local production Worker build par, har suite se pehle saaf local database.
# Production ya dev ka database kabhi nahi chhoota: sirf .wrangler/state (local) istemal hota hai.
#
# Usage: pnpm test:browser            (pehle se bana build)
#        pnpm test:browser --build    (pehle opennextjs-cloudflare build)
# Chromium ka path: CHROMIUM_PATH=/path/to/chrome (na ho to Playwright ka apna browser)
set -uo pipefail
cd "$(dirname "$0")/../.."

PORT=8787
BASE="http://127.0.0.1:$PORT"
OUT=test-results/browser
LOG="$OUT/preview.log"
mkdir -p "$OUT"

# Local config: wrangler.jsonc jaisa, magar D1 local (remote: false). Dono files gitignored hain.
if [ ! -f wrangler.preview.jsonc ]; then
  sed 's/"remote": true/"remote": false/' wrangler.jsonc > wrangler.preview.jsonc
fi
if [ ! -f .dev.vars ]; then
  # SERVER_URL / ALLOWED_ORIGINS: local address, taake csrf check bhi asal jaisa chale
  printf 'PAYLOAD_SECRET=local-browser-tests-only\nSERVER_URL=%s\nALLOWED_ORIGINS=%s\n' "$BASE" "$BASE" > .dev.vars
fi

if [ "${1:-}" = "--build" ] || [ ! -f .open-next/worker.js ]; then
  pnpm exec opennextjs-cloudflare build || exit 1
fi

stop_preview() {
  for p in $(pgrep -f "wrangler.* dev --config wrangler.preview.jsonc" || true); do
    [ "$p" != "$$" ] && kill "$p" 2>/dev/null
  done
  for p in $(pgrep -x workerd || true); do kill "$p" 2>/dev/null; done
  sleep 2
}

start_fresh() {
  stop_preview
  rm -rf .wrangler/state/v3/d1
  pnpm payload migrate > "$OUT/migrate.log" 2>&1 && pnpm seed:admin >> "$OUT/migrate.log" 2>&1 || {
    echo "migrate/seed failed, see $OUT/migrate.log"
    return 1
  }
  (nohup pnpm exec wrangler dev --config wrangler.preview.jsonc --port $PORT --ip 127.0.0.1 > "$LOG" 2>&1 &)
  for _ in $(seq 1 60); do
    grep -q "Ready on" "$LOG" 2>/dev/null && curl -s -o /dev/null "$BASE/" && return 0
    sleep 2
  done
  echo "preview did not start, see $LOG"
  return 1
}

summary=()
status=0
for suite in auth-boards save-share canvas live-check; do
  echo "=== $suite"
  start_fresh || exit 1
  if [ "$suite" = live-check ]; then
    rm -rf live-check-output "$OUT/live-check"
    node scripts/live-check.mjs "$BASE" > "$OUT/$suite.log" 2>&1
    code=$?
    mv live-check-output "$OUT/live-check" 2>/dev/null
  else
    node "tests/browser/$suite.mjs" "$OUT/$suite" "$BASE" > "$OUT/$suite.log" 2>&1
    code=$?
  fi
  result=$(grep -E "checks passed|steps passed" "$OUT/$suite.log" | tail -1)
  grep -E "^FAIL" "$OUT/$suite.log"
  summary+=("$suite: ${result:-crashed, see $OUT/$suite.log}")
  [ $code -ne 0 ] && status=1
done
stop_preview

echo
printf '%s\n' "${summary[@]}"
echo "Logs and screenshots: $OUT/"
exit $status
