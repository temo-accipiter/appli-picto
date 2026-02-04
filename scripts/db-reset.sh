#!/bin/bash
# ============================================================================
# db-reset.sh — Full database reset including privileged storage migrations
# ============================================================================
# Usage: ./scripts/db-reset.sh
#
# This script handles the Supabase limitation where the standard migration
# runner (postgres role) cannot create policies on storage.objects.
# We use supabase_admin (superuser) for Phase 8.2.
# ============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔄 Step 1/3: Resetting database (standard migrations)...${NC}"

# Run db reset WITHOUT set -e so we can handle the expected failure gracefully
# Phase 8.2 is no longer in migrations/, so this should succeed fully now
if supabase db reset; then
  echo -e "${GREEN}✅ Standard migrations completed successfully${NC}"
else
  echo -e "${RED}❌ supabase db reset failed unexpectedly${NC}"
  exit 1
fi

echo -e "${YELLOW}🔐 Step 2/3: Applying privileged storage migration (Phase 8.2)...${NC}"

# Apply Phase 8.2 as supabase_admin (superuser)
if psql postgresql://supabase_admin:postgres@127.0.0.1:5432/postgres \
  -v ON_ERROR_STOP=1 \
  -f supabase/migrations_privileged/20260204102000_phase8_2_storage_rls_policies.sql; then
  echo -e "${GREEN}✅ Phase 8.2 storage policies installed${NC}"
else
  echo -e "${RED}❌ Phase 8.2 failed. Check the SQL file for errors.${NC}"
  exit 1
fi

echo -e "${YELLOW}🌱 Step 3/3: Running seeds (if any)...${NC}"

# Seeds are optional, don't fail if none exist
if [ -f "supabase/seed.sql" ]; then
  psql postgresql://postgres:postgres@127.0.0.1:5432/postgres \
    -f supabase/seed.sql 2>/dev/null && \
    echo -e "${GREEN}✅ Seeds applied${NC}" || \
    echo -e "${YELLOW}⚠️  Seeds skipped or empty${NC}"
else
  echo -e "${YELLOW}⚠️  No seed.sql found, skipping${NC}"
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Database reset complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Verification commands:"
echo "  psql postgresql://postgres:postgres@127.0.0.1:5432/postgres -c \"SELECT * FROM storage.buckets;\""
echo "  psql postgresql://postgres:postgres@127.0.0.1:5432/postgres -c \"SELECT policyname FROM pg_policies WHERE schemaname='storage';\""