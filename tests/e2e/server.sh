#!/usr/bin/env bash
# Local production Worker (wrangler dev) aur local D1 — sirf .wrangler/state; dev/production DB kabhi nahi.
#   bash tests/e2e/server.sh build        -> opennextjs-cloudflare build (agar BUILD=1 ya build maujood na ho)
#   bash tests/e2e/server.sh start-fresh  -> server band, DB saaf, migrate + admin seed, server shuru
#   bash tests/e2e/server.sh stop
#   bash tests/e2e/server.sh logs         -> har server (is run ke) log ki aakhri lines (CI me fail par)
set -uo pipefail
cd "$(dirname "$0")/../.."

PORT=8787
BASE="http://127.0.0.1:$PORT"
OUT=test-results/server
LOG="$OUT/preview.log"
# Har spec naya server chalata he; pichhle servers ke logs yahan jama (fail wale spec ka log mite nahi)
HISTORY="$OUT/preview-history.log"
mkdir -p "$OUT"

prepare() {
  # wrangler.jsonc jaisa, magar D1 local (remote: false). Dono files gitignored hain.
  [ -f wrangler.preview.jsonc ] || sed 's/"remote": true/"remote": false/' wrangler.jsonc > wrangler.preview.jsonc
  if [ ! -f .dev.vars ]; then
    # SERVER_URL / ALLOWED_ORIGINS = local address, taake csrf check bhi asal jaisa chale
    printf 'PAYLOAD_SECRET=local-tests-only\nSERVER_URL=%s\nALLOWED_ORIGINS=%s\n' "$BASE" "$BASE" > .dev.vars
  fi
}

stop() {
  for p in $(pgrep -f "wrangler.* dev --config wrangler.preview.jsonc" || true); do
    [ "$p" != "$$" ] && kill "$p" 2>/dev/null
  done
  for p in $(pgrep -x workerd || true); do kill "$p" 2>/dev/null; done
  sleep 2
}

case "${1:-}" in
  build)
    prepare
    # Har test run (global setup) naye logs se shuru
    rm -f "$HISTORY" "$LOG"
    if [ "${BUILD:-}" = 1 ] || [ ! -f .open-next/worker.js ]; then
      pnpm exec opennextjs-cloudflare build > "$OUT/build.log" 2>&1 || { tail -30 "$OUT/build.log"; exit 1; }
    fi
    ;;
  start-fresh)
    prepare
    stop
    rm -rf .wrangler/state/v3/d1
    pnpm payload migrate > "$OUT/migrate.log" 2>&1 && pnpm seed:admin >> "$OUT/migrate.log" 2>&1 || {
      tail -30 "$OUT/migrate.log"
      exit 1
    }
    # Pichhle server ka log history me, phir naye server ka saaf log (readiness sirf naye me dhoondi jaye)
    if [ -f "$LOG" ]; then
      cat "$LOG" >> "$HISTORY"
    fi
    echo "===== server started $(date -u +%H:%M:%S) =====" > "$LOG"
    (nohup pnpm exec wrangler dev --config wrangler.preview.jsonc --port $PORT --ip 127.0.0.1 >> "$LOG" 2>&1 &)
    for _ in $(seq 1 60); do
      grep -q "Ready on" "$LOG" 2>/dev/null && curl -s -o /dev/null "$BASE/" && exit 0
      sleep 2
    done
    echo "preview did not start, see $LOG"
    tail -30 "$LOG"
    exit 1
    ;;
  stop)
    stop
    ;;
  logs)
    # Har server ki aakhri ${LINES:-60} lines — band hone se pehle ki baat (crash, CPU, memory) yahin hoti he
    cat "$HISTORY" "$LOG" 2>/dev/null | awk -v n="${LINES:-60}" '
      /^===== server started / { if (count) dump(); count = 0; head = $0; next }
      { buf[count % n] = $0; count++ }
      function dump(  i, start) {
        print head
        if (count > n) print "  ... (" count - n " earlier lines)"
        start = count > n ? count - n : 0
        for (i = start; i < count; i++) print buf[i % n]
        print ""
      }
      END { if (count || head) dump() }'
    ;;
  *)
    echo "usage: $0 build|start-fresh|stop|logs"
    exit 2
    ;;
esac
