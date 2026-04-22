# Redirect Test Suite

This suite tests the source-aware redirect functionality for PanelFlow.

## Structure

- `unit/` - Unit tests for RedirectResolver class
- `e2e/` - End-to-end integration tests (via Playwright)
- `utils/` - Helper functions for tests
- `fixtures/` - Test data (SQL scripts, reference JSON)

## Running Tests

### Unit Tests (Jest)
```bash
npm test -- tests/redirect/unit/
# or
npx jest tests/redirect/unit/
```

### E2E Tests (Playwright)
```bash
# Make sure dev server is running on port 3000
npm run dev

# In another terminal, run e2e tests
npx playwright test tests/e2e/source-aware-redirects.spec.ts
```

## Test Coverage

The tests verify:

1. **Direct Flow** (`source = 'direct'`)
   - Redirects to internal `/redirect/complete` page
   - Preserves UID/PID in cookies
   - Uses project landing page if configured

2. **Supplier Flow** (`source = 'supplier'`)
   - Redirects to supplier's external URL
   - Injects UID/PID into redirect parameters
   - Respects vendor-specific parameter names
   - Prioritizes link-level over supplier-level redirects
   - Falls back to project landing page if no supplier config

3. **Parameter Injection**
   - Placeholder replacement: `{uid}`, `{pid}`, `{status}`
   - Bracket notation: `[UID]`, `[PID]`
   - Double braces: `{{uid}}`, `{{pid}}`
   - Custom param names from supplier config

4. **Multi-Status Flows**
   - `complete` → normal redirect
   - `terminate` → termination page
   - `quota_full` → quota full page

## Fixtures

The test data is defined in `fixtures/reference-values.json`:

```json
{
  "project": {
    "code": "TEST_REDIRECT_PROJECT",
    "baseUrl": "https://survey.example.com"
  },
  "supplier": {
    "token": "MACK",
    "redirects": { ... }
  },
  "testUser": {
    "uid": "OPGHUS01"
  }
}
```

### Seeding Test Database

Before running tests, ensure the test database has the required records:

```bash
# Using the SQL script
psql -U your_user -d your_db -f tests/redirect/fixtures/test-data.sql
```

Or via Supabase dashboard / API.

## Test Data Cleanup

After tests, you can clean up test data:

```bash
psql -U your_user -d your_db -f tests/redirect/fixtures/test-data-cleanup.sql
```

## Annotations

Some tests are marked with `{ annotation: { type: 'todo', description: '...' } }` indicating they require additional setup or are placeholders for future expansion.

## Coverage Goals

- RedirectResolver: 100% branch coverage
- Parameter injection logic: 100%
- Priority resolution (link > supplier > project > default): 100%
