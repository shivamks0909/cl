# Automated Redirect Testing Suite - Design Spec

## Overview
Build an automated test suite for PanelFlow redirect flows with live Supabase database validation. Tests run both locally (pre-commit) and in CI/CD.

**Scope**: Functional correctness, security edge cases, performance benchmarks.

## Architecture

### Test Structure
```
tests/redirect/
├── fixtures/
│   ├── test-data.sql          # Creates TEST_REDIRECT_PROJECT, TEST_SUPPLIER_MACK
│   ├── test-data-cleanup.sql  # Removes test fixtures
│   └── reference-values.json  # Expected values for assertions
├── api/
│   ├── direct-entry.test.ts
│   ├── direct-complete.test.ts
│   ├── supplier-entry.test.ts
│   ├── supplier-complete.test.ts
│   ├── supplier-mapping.test.ts
│   ├── supplier-quota-zero.test.ts
│   ├── quota-full-callback.test.ts
│   ├── fake-callback-prevention.test.ts
│   ├── duplicate-prevention.test.ts
│   ├── redirect-resolution.test.ts
│   └── performance-benchmarks.test.ts
├── e2e/
│   ├── direct-flow.spec.ts
│   ├── supplier-flow.spec.ts
│   └── redirect-handling.spec.ts
├── utils/
│   ├── db-validator.ts        # Database assertions
│   ├── test-helper.ts         # HTTP client, setup/teardown
│   └── performance-monitor.ts
└── jest.setup.ts
```

### Test Data
**Fixed Fixtures** (from PRD):
- Project code: `TEST_REDIRECT_PROJECT`
- PID: `TEST_PID_REDIRECT_001`
- Supplier token: `MACK`
- Test UID: `OPGHUS01`

SQL scripts insert these into the test Supabase database.

### Core Components

**1. DB Validator (`utils/db-validator.ts`)**
Centralized database queries:
- `getResponseByPidUid(pid, uid)`
- `getResponseBySession(sessionToken)`
- `getSupplierById(id)`
- `getSupplierProjectLink(supplierId, projectId)`
- `assertSupplierMapping(response, expectedSupplier)`
- `countAuditLogs(eventType, filters)`

**2. Test Helper (`utils/test-helper.ts`)**
- HTTP client wrapper around Supertest
- `setupTestFixtures()` - runs SQL scripts
- `teardownTestFixtures()` - cleanup
- `waitForDbAsync(condition, timeout)` - polling for async DB updates

**3. Performance Monitor (`utils/performance-monitor.ts`)**
- Measure response times
- Track database query latency
- Log slow operations

### Test Flow (API Tests)
Each test:
1. **Setup**: Ensure fixtures exist (handled globally)
2. **Execute**: HTTP request to endpoint
3. **Assert**: HTTP response (status, headers, cookies)
4. **Validate DB**: Query actual database state
5. **Cleanup**: None (fixtures shared, tests isolated by UIDs)

### E2E Tests (Playwright)
- Full browser simulation
- Navigate entry URL → complete survey → callback → outcome page
- Capture screenshots on failure
- Verify database after flow completes

### Performance Tests
- Concurrent entry requests (10, 25, 50)
- Measure p50/p95/p99 response times
- Verify rate limiting (3 reqs/min per IP)
- Monitor DB query performance

## Implementation Details

### Dependencies
- Jest + Supertest (already in package.json)
- Playwright + @playwright/test
- Supabase JS client (for direct DB queries in validator)

### CI/CD Integration
`.github/workflows/redirect-tests.yml`:
```yaml
jobs:
  redirect-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:redirect:setup
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SUPABASE_KEY }}
      - run: npm run test:redirect:api
      - run: npm run test:redirect:e2e
      - run: npm run test:redirect:perf
```

### Local Development
`package.json` scripts:
- `test:redirect:setup` - Insert fixtures
- `test:redirect:api` - Run Jest API tests
- `test:redirect:e2e` - Run Playwright
- `test:redirect:perf` - Run performance tests
- `test:redirect` - Run all
- `test:redirect:teardown` - Cleanup

## Fixtures SQL
`tests/redirect/fixtures/test-data.sql` from PRD `scripts/setup-mack-test.sql`:
- Create project with PID generation
- Create supplier with redirect URLs
- Link supplier to project

## Security Considerations
- Use dedicated test Supabase project (never production)
- Test data has known, fixed values
- Service role key stored in CI secrets only
- Fixtures cleanup after test run (optional but recommended)

## Success Criteria
- All 9 PRD test cases automated and passing
- DB validation confirms correct writes
- Security tests prevent fake callbacks
- Performance tests meet latency targets (< 200ms p95)
- Zero flaky tests (retries disabled in CI)

## Notes
- Tests run against real Supabase DB (test project), not mocks
- Frontend bypassed - validate backend/database directly
- Fail if DB layer has issues; do not patch frontend to hide problems
