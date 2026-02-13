#!/usr/bin/env bash
set -euo pipefail

export DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:5432/postgres}"
LOG="${LOG:-/tmp/supabase-smoke-tests.log}"
: > "$LOG"

echo "DB_URL=$DB_URL" | tee -a "$LOG"
echo "Running smoke tests..." | tee -a "$LOG"

fails=0
total=0

while IFS= read -r f; do
  total=$((total+1))
  echo "==> running $f" | tee -a "$LOG"
  if ! psql "$DB_URL" -v ON_ERROR_STOP=1 -X -f "$f" >>"$LOG" 2>&1; then
    echo "❌ FAIL $f" | tee -a "$LOG"
    fails=$((fails+1))
  else
    echo "✅ PASS $f" | tee -a "$LOG"
  fi
done < <(find supabase/tests -type f -name "*.sql" -print | sort)

echo "====================" | tee -a "$LOG"
echo "TOTAL: $total" | tee -a "$LOG"
echo "FAILURES: $fails" | tee -a "$LOG"
echo "LOG: $LOG" | tee -a "$LOG"
echo "====================" | tee -a "$LOG"

if [ "$fails" -eq 0 ]; then
  echo "✅ ALL SUPABASE SMOKE TESTS PASSED" | tee -a "$LOG"
else
  echo "⚠️ FAILURES: $fails (see $LOG)" | tee -a "$LOG"
fi

exit "$fails"
