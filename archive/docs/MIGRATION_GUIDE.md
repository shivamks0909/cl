# 🚨 CRITICAL: Database Schema Migration Required

## Problem

The production database is missing several critical columns that the application code expects:

1. **supplier_project_links** table missing:
   - `quota_allocated` INTEGER
   - `quota_used` INTEGER

2. **s2s_config** table missing:
   - `require_s2s_for_complete` BOOLEAN
   - `allow_test_mode` BOOLEAN

These columns are present in the codebase's migration files but have not been applied to the Supabase database.

## Impact

- **Supplier quota management** will fail (quota checking will throw errors)
- **S2S callback verification** may not work correctly
- **Test data setup** fails when trying to insert these columns
- **Production deployment** will have runtime errors

## Solution: Apply Full Schema Migration

### Option 1: Supabase SQL Editor (Recommended)

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: `3gkhhr9f-...`
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the entire contents of `scripts/migrate-full-schema.sql`
6. Click **Run** (or Ctrl+Enter)

The migration is idempotent (safe to run multiple times) and will:
- Add any missing columns
- Create missing tables
- Add indexes
- Insert fallback data

### Option 2: Via Command Line (psql)

If you have psql installed:

```bash
psql "postgresql://postgres:[PASSWORD]@3gkhhr9f.us-east.database.insforge.app:5432/insforge?sslmode=require" -f scripts/migrate-full-schema.sql
```

Replace `[PASSWORD]` with your database password.

### Option 3: Via Application (if you have admin API)

You can use the InsForge MCP server or API to execute raw SQL, but the SQL Editor is simplest.

## After Migration

1. **Re-run test data setup** (if needed):
   ```bash
   node setup-test-data.js
   ```

2. **Verify columns exist**:
   ```bash
   node list-projects.js
   ```
   Should show all projects including test ones.

3. **Run tests**:
   ```bash
   node test-routing.js
   ```

4. **Deploy to production**:
   ```bash
   vercel --prod
   ```

## Files Modified in This Session

- `insforge-schema.sql` - Updated with quota columns
- `scripts/migrate-full-schema.sql` - Updated with quota columns and proper S2S config
- `lib/tracking-service.ts` - Added quota checking and increment logic
- `setup-test-data.js` - Updated to create test data (will work after migration)
- `MASTER_TEST_PLAN.md` - Comprehensive test plan

## Test URLs (after migration)

- Direct: `/r/TEST_SINGLE/DYN01/UID123`
- Supplier: `/r/TEST_SINGLE/TEST_SUPPLIER/UID456`
- Paused: `/r/TEST_PAUSED/DYN01/UID789`
- Multi-country: `/r/TEST_MULTI/DYN01/UID101?country=US`
- Duplicate test: Same UID twice → `/status?type=duplicate_string`
- Quota test: Supplier with quota=1, use twice → `/quotafull`

---

**⚠️ ACTION REQUIRED:** Apply `scripts/migrate-full-schema.sql` to your Supabase database before proceeding with tests or deployment.
