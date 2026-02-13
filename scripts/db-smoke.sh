#!/usr/bin/env bash
set -euo pipefail

export DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:5432/postgres}"

fails=0
while IFS= read -r f; do
  echo "==> running $f"
  if ! psql "$DB_URL" -v ON_ERROR_STOP=1 -X -f "$f"; then
    echo "❌ FAIL $f"
    fails=$((fails+1))
  else
    echo "✅ PASS $f"
  fi
done < <(find supabase/tests -type f -name "*.sql" -print | sort)

if [ "$fails" -eq 0 ]; then
  echo "✅ ALL SUPABASE SMOKE TESTS PASSED"
else
  echo "⚠️ FAILURES: $fails"
fi

exit "$fails"
