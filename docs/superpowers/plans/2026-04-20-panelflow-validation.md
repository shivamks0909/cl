# PanelFlow Pre-Production Validation - Implementation Plan

**Date:** 2026-04-20
**Phase:** 1 - Writing Plans
**Methodology:** `superpowers:writing-plans`
**Status:** READY FOR EXECUTION

---

## Overview

This plan decomposes the validation into **150+ bite-sized tasks** (2-5 minutes each). Tasks are organized into **parallel groups** for maximum efficiency using `superpowers:dispatching-parallel-agents`.

**Total Estimated Effort:** 11 hours (with 4-way parallelization → ~3 hours wall time)

---

## Instructions for Agentic Workers

- Use `superpowers:subagent-driven-development` for independent task groups
- Execute tasks in order within each group
- Mark tasks complete in this document as you finish
- For failures, immediately invoke `superpowers:systematic-debugging` before proceeding
- Before claiming any group complete, run `superpowers:verification-before-completion`

---

## Task Groups

### GROUP A: TEST INFRASTRUCTURE SETUP (10 tasks)

**Dependencies:** None (can run standalone)
**Parallelization:** Single agent (sequential)

---

#### A1: Verify Jest Configuration

**Description:** Ensure Jest testing framework is properly configured and can compile TypeScript.

**Commands:**
```bash
cd d:\new12-main
npx jest --showConfig
```

**Expected Output:** JSON configuration with `preset: 'ts-jest'` and correct `testMatch` patterns.

**Success Criteria:** Config output shows TypeScript support enabled.

**Time:** 2 min

---

#### A2: Verify Playwright Configuration

**Description:** Check Playwright test runner setup and install browsers if needed.

**Commands:**
```bash
cd d:\new12-main
npx playwright --version
npx playwright install chromium  # if not already installed
```

**Expected Output:** Playwright version and browser installation confirmation.

**Success Criteria:** `playwright.config.ts` exists and browsers installed.

**Time:** 5 min (may take longer for browser install)

---

#### A3: Create Test Database Fixture

**Description:** Create a fresh test database with deterministic seed data for Jest tests.

**File to Create:** `tests/setup-db.ts`

**Content:** Initialize SQLite in-memory or `./data/test_validation.db` with schema from `scripts/migrate-full-schema.sql` (extract DDL). Insert known test data:

- Project: `TEST_VALID` (active, single-country)
- Project: `TEST_MULTI` (multi-country US,GB active)
- Project: `TEST_PAUSED` (paused)
- Supplier: `SUP_VALID` (unlimited quota on TEST_VALID)
- Supplier: `SUP_QUOTA` (5 quota on TEST_MULTI)

**Success Criteria:** `db` helper available in tests that returns clean DB with known state.

**Time:** 5 min

---

#### A4: Create Mock Supabase Client

**Description:** For unit tests that need Supabase client, create a mock that simulates InsForge responses.

**File to Create:** `tests/mocks/supabase-mock.ts`

**Functions to Implement:**
- `mockFrom()`: returns query builder chain
- `mockSelect()`, `mockInsert()`, `mockUpdate()`, `mockEq()`, `mockSingle()`, `mockExecute()`
- Should return predictable mock data, support call count assertions

**Success Criteria:** Can `import { mockSupabase } from './mocks/supabase-mock'` in unit tests.

**Time:** 10 min

---

#### A5: Create Test Helper Utilities

**Directory:** `tests/helpers/`

**Files to Create:**
- `db-reset.ts`: function to truncate all tables and re-seed
- `seed-test-data.ts`: insert known test fixtures
- `create-test-request.ts`: helper to build fake Next.js request objects
- `assert-response.ts`: common assertions (status code, redirect location, cookies)

**Success Criteria:** Helpers importable and work with test database.

**Time:** 10 min

---

#### A6: Install Playwright Browsers (if needed)

**Description:** Ensure all Playwright browsers are installed system-wide.

**Command:**
```bash
cd d:\new12-main
npx playwright install --with-deps chromium firefox webkit
```

**Expected Output:** All browsers installed successfully.

**Success Criteria:** `npx playwright test --list` shows no browser errors.

**Time:** 10 min (may take longer)

---

#### A7: Configure Test Environment Variables

**File:** `.env.test` (create from `.env.local`)

**Content:**
```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_INSFORGE_URL=
INSFORGE_API_KEY=
NODE_ENV=test
NEXTAUTH_SECRET=test-secret-for-validation-only
```

Also update `jest.config.js` to use `dotenv` and load `.env.test`.

**Success Criteria:** Tests run without reading real credentials.

**Time:** 5 min

---

#### A8: Create Coverage Reporter Setup

**Description:** Configure Jest to generate coverage reports in `./coverage/`.

**Changes to `jest.config.js`:**
- Add `collectCoverage: true`
- Set `coverageDirectory: './coverage'`
- Add coverage thresholds: `branches: 90`, `functions: 90`, `lines: 90`, `statements: 90`

**Success Criteria:** After running tests, `coverage/lcov-report/index.html` exists.

**Time:** 5 min

---

#### A9: Create Parallel Test Runner Script

**File:** `scripts/run-validation.js`

**Purpose:** Orchestrate running all test suites in parallel (or sequentially if simpler).

**Logic:**
- Accept arguments: `--unit`, `--integration`, `--e2e`, `--security`, `--all`
- Run corresponding test commands:
  - Unit: `npx jest tests/unit --coverage=false`
  - Integration: `npx jest tests/integration`
  - E2E: `npx playwright test tests/e2e`
  - Security: `npm run test:security` (existing)
- Capture exit codes, output summary
- Exit with non-zero if any suite fails

**Success Criteria:** `node scripts/run-validation.js --all` runs all tests and reports pass/fail.

**Time:** 15 min

---

#### A10: Sanity Check - Initial Test Run

**Description:** Run the test suite once to establish baseline (expect failures due to missing tests or infrastructure issues).

**Command:**
```bash
cd d:\new12-main
node scripts/run-validation.js --all
```

**Expected Output:** Some tests pass, some fail, some skipped. Document current state.

**Success Criteria:** We have baseline metrics: how many tests exist, how many pass now.

**Time:** 20 min

---

**GROUP A COMPLETE:** Infrastructure ready for scale testing

---

### GROUP B: UNIT TESTS - DATABASE LAYER (10 tasks)

**Dependencies:** Group A complete
**Parallelization:** Single agent (or split further if needed)

**Test File:** `tests/unit/db-layer.test.ts`

---

#### B1: Test Unified DB - InsForge Connection

```typescript
test('unified-db: uses InsForge when URL configured', () => {
  process.env.NEXT_PUBLIC_INSFORGE_URL = 'https://insforge.example.com';
  const db = createUnifiedDb();
  expect(db.provider).toBe('insforge');
});
```

**Time:** 3 min

---

#### B2: Test Unified DB - SQLite Fallback

```typescript
test('unified-db: falls back to SQLite when InsForge not configured', () => {
  process.env.NEXT_PUBLIC_INSFORGE_URL = '';
  const db = createUnifiedDb();
  expect(db.provider).toBe('sqlite');
});
```

**Time:** 3 min

---

#### B3: Test Parameterized Query Execution

```typescript
test('db: parameterized query prevents SQL injection', async () => {
  const db = getTestDb();
  const result = await db.query('SELECT * FROM projects WHERE code = $1', ['TEST; DROP TABLE projects']);
  expect(result).not.toThrow();
  expect(result.rows.length).toBe(0 || expectedSafeResult); // injection attempt sanitized
});
```

**Time:** 3 min

---

#### B4: Test Connection Pool Acquisition

```typescript
test('db: connection pool provides connections', async () => {
  const db = getTestDb();
  const client = await db.pool.connect();
  expect(client).toBeDefined();
  client.release();
});
```

**Time:** 2 min

---

#### B5: Test Transaction Atomicity

```typescript
test('db: transaction rolls back on error', async () => {
  const db = getTestDb();
  await expect(async () => {
    await db.transaction(async (trx) => {
      await trx.query('INSERT INTO projects (code) VALUES ($1)', ['T1']);
      await trx.query('INVALID SQL'); // forces rollback
    });
  }).rejects.toThrow();
  const count = await db.query('SELECT COUNT(*) FROM projects WHERE code = $1', ['T1']);
  expect(count.rows[0].count).toBe(0); // transaction rolled back
});
```

**Time:** 5 min

---

#### B6-B10: Additional DB layer tests (error propagation, connection errors, query timeout, etc.)

**Time:** 10 min total

---

**GROUP B COMPLETE:** Database layer validated

---

### GROUP C: UNIT TESTS - SERVICE LAYER (20 tasks)

**Test File:** `tests/unit/services.test.ts`

---

#### C1-C5: Audit Service Tests

**C1: `auditService.log()` writes to `audit_logs` table**
**C2: `auditService.getLogs()` retrieves with pagination**
**C3: `auditService.getLogs()` respects limit/offset**
**C4: `auditService.log()` adds `created_at` automatically**
**C5: `auditService` handles DB errors gracefully (doesn't crash)**

---

#### C6-C10: Tracking Service Tests

**C6: `trackingService.validateEntry()` checks quota**
**C7: `trackingService.validateEntry()` checks IP throttle**
**C8: `trackingService.validateEntry()` checks duplicate UID**
**C9: `trackingService.validateEntry()` checks multi-country validation**
**C10: `trackingService.validateEntry()` performs all checks in correct order**

---

#### C11-C15: GeoIP Service Tests

**C11: `geoipService.getCountry()` uses Vercel headers first**
**C12: Falls back to ip-api.com when headers missing**
**C13: Falls back to MaxMind when ip-api fails**
**C14: Handles offline gracefully (returns null)**
**C15: Caches lookups to avoid repeated API calls**

---

#### C16-C20: Redirect Resolver Tests

**C16: `redirectResolver.resolve()` returns `direct` for direct flow**
**C17: `redirectResolver.resolve()` returns `supplier` for supplier flow**
**C18: `redirectResolver.resolve()` uses supplier redirect URL when configured**
**C19: `redirectResolver.resolve()` falls back to PanelFlow pages by default**
**C20: `redirectResolver.resolve()` handles missing project gracefully**

---

#### C21-C25: Security Middleware Tests

**C21: Rate limiter: 3rd request blocked (429 or redirect)**
**C22: Rate limiter: different project does NOT share limit**
**C23: Rate limiter: after 60s, counter resets**
**C24: Session parser: extracts `oi_session` from query/cookie**
**C25: Session parser: handles missing session gracefully**

---

**TIME:** ~40 min for C1-C25 (20 tests × 2 min avg)

---

**GROUP C COMPLETE:** Service layer validated

---

### GROUP D: UNIT TESTS - UTILITY LAYER (10 tasks)

**Test File:** `tests/unit/utils.test.ts`

---

#### D1-D3: IP Extraction

**D1: `getClientIp()` uses `x-forwarded-for` when present**
**D2: `getClientIp()` falls back to `x-real-ip`**
**D3: `getClientIp()` falls back to `remoteAddress`**

---

#### D4-D6: UID Sanitization

**D4: `normalizeUid()` trims whitespace**
**D5: `normalizeUid()` case-insensitive (lowercases)**
**D6: `normalizeUid()` unicode-normalizes (NFKC)**

---

#### D7-D9: HMAC Functions

**D7: `generateHmac()` produces consistent signature for same inputs**
**D8: `verifyHmac()` validates correct signature**
**D9: `verifyHmac()` rejects tampered payload**

---

#### D10: Cookie Utilities

**D10: `parseCookies()` handles multiple cookies, malformed input**

---

**TIME:** ~20 min

---

**GROUP D COMPLETE:** Utility layer validated

---

### GROUP E: INTEGRATION TESTS - API ENDPOINTS (15 tasks)

**Test File:** `tests/integration/api-endpoints.test.ts`

**Setup:** Use Supertest to call real API routes with test DB.

---

#### E1: GET `/api/health`

```typescript
test('GET /api/health returns db_source and latency', async () => {
  const res = await request(app).get('/api/health');
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('db_source');
  expect(res.body).toHaveProperty('latency_ms');
  expect(typeof res.body.latency_ms).toBe('number');
});
```

**Time:** 3 min

---

#### E2-E4: Callback API - HMAC Verification

**E2: Valid HMAC → 200, updates response status**
**E3: Missing HMAC → 403**
**E4: Invalid HMAC → 403**

---

#### E5-E7: Callback API - Idempotency

**E5: Second complete callback after status complete → no change**
**E6: Terminate after complete → remains complete**
**E7: Complete after terminate → remains terminated**

---

#### E8-E10: Callback API - Quota Charging

**E8: Complete callback increments `quota_used` and sets `quota_charged=true`**
**E9: Terminate callback does NOT increment `quota_used`**
**E10: Quotafull callback does NOT increment `quota_used`**

---

#### E11-E13: Admin API - Authentication

**E11: `/api/admin/projects` without session → 401**
**E12: With valid admin session → 200 + JSON**
**E13: POST `/api/admin/projects` requires auth, creates project**

---

#### E14: Respondent Stats API

**E14: `/api/respondent-stats/:session` returns correct counts**

---

#### E15: S2S Callback API

**E15: `/api/s2s/callback` validates session and returns respondent data**

---

**TIME:** ~40 min

---

**GROUP E COMPLETE:** API endpoints validated

---

### GROUP F: INTEGRATION TESTS - ROUTER LOGIC (15 tasks)

**Test File:** `tests/integration/router-integration.test.ts`

**Helper:** Use `tests/helpers/create-test-request.ts` to build requests with cookies/headers.

---

#### F1-F8: Unified Router Scenarios

**F1: Valid direct entry → 302 redirect, sets cookies (last_uid, last_sid, last_pid)**
**F2: Valid supplier entry → 302, session contains supplier_token**
**F3: Quota exceeded → 302 to `/quotafull`**
**F4: Duplicate UID → 302 to `/duplicate-string`**
**F5: IP throttled (4th request) → 302 to `/security-terminate`**
**F6: Paused project → 302 to `/paused?title=PROJECT_PAUSED`**
**F7: Invalid project code → 302 to `/paused?title=PROJECT_NOT_FOUND`**
**F8: Multi-country with inactive country (DE) → 302 to `/country-unavailable`**

---

#### F9-F15: Legacy Router (`/track`) - same scenarios

**F9-F15: Mirror F1-F8 for `/track` endpoint**

---

**TIME:** ~45 min

---

**GROUP F COMPLETE:** Router logic validated

---

### GROUP G: E2E TESTS - FULL FLOW SCENARIOS (10 tasks)

**Test File:** `tests/e2e/flows.spec.ts`

**Setup:** Playwright with test server (`npm start` on random port) or Vercel dev.

---

#### G1: Direct Flow End-to-End

**Steps:**
1. `page.goto('http://localhost:3000/r/TEST_VALID/SUP_VALID/UID12345')`
2. Verify 302 redirect to external survey URL (mock survey or real)
3. Follow redirect or mock callback hit
4. Simulate callback: `page.goto('/api/callback?session=...&type=complete')`
5. Verify redirect to `/redirect/complete` (internal PanelFlow page)
6. Assert page content: "Thank you" or completion message
7. Check DB: response exists with `source='direct'`, `status='complete'`

**Time:** 8 min

---

#### G2: Supplier Flow End-to-End

**Steps:**
1. First hit supplier link which sets supplier_token in session
2. Then entry with supplier in URL
3. External survey → callback
4. **Verify redirect goes to supplier's landing page** (NOT PanelFlow `/complete`)
5. Check DB: `source='supplier'`, `supplier_uid_incoming` set

**Time:** 10 min

---

#### G3: Quota Full Flow

**Steps:**
1. Set supplier quota to 1
2. First entry + callback succeeds
3. Second entry allowed (quota not checked on entry)
4. Second callback with `type=quotafull`
5. Verify redirect to `/quotafull` (or supplier's redirect if configured)
6. Check DB: response status remains `complete` (first), `quotafull` (second?)

**Time:** 10 min

---

#### G4: Duplicate UID Flow

**Steps:**
1. Entry with UID `DUPUSER` → success
2. Entry with same UID `DUPUSER` → blocked, redirect to `/duplicate-string`
3. Verify second entry does NOT create new response
4. Check DB: only one response with that UID

**Time:** 5 min

---

#### G5: IP Throttle Flow

**Steps:**
1. Use same browser context (same IP) to make 4 rapid entries
2. First 3 succeed (302)
3. 4th redirects to `/security-terminate`
4. Verify throttle resets after 60s (mock time or wait)

**Time:** 8 min (includes wait for throttle reset)

---

#### G6: Admin Login Flow

**Steps:**
1. `page.goto('/login')`
2. Fill credentials: `admin@opinioninsights.com` / `admin123`
3. Submit
4. Verify redirect to `/admin`
5. Logout → redirect to `/login`

**Time:** 5 min

---

#### G7: Project Creation Flow

**Steps:**
1. Login as admin
2. Navigate to Projects → Create New
3. Fill form: code `E2E_TEST_1`, name, active countries
4. Submit
5. Verify project appears in list
6. Check DB: project exists

**Time:** 8 min

---

#### G8: Supplier Creation Flow

**Steps:**
1. Admin → Suppliers → Create
2. Fill: name, complete_redirect_url, quota
3. Submit
4. Verify supplier in list
5. Link supplier to project via UI or API

**Time:** 8 min

---

#### G9: Response Table Viewing

**Steps:**
1. Navigate to Responses page as admin
2. Verify table displays existing responses
3. Use search/filter → results filter correctly
4. Click pagination → navigation works

**Time:** 5 min

---

#### G10: Audit Log Viewing

**Steps:**
1. Navigate to Audit Logs page
2. Verify entries show event_type, timestamp, IP
3. Filter by project → shows only that project's logs
4. Pagination works

**Time:** 5 min

---

**TIME:** ~70 min for G1-G10

---

**GROUP G COMPLETE:** Full E2E flows validated

---

### GROUP H: E2E TESTS - UI COMPONENTS (5 tasks)

**Test File:** `tests/e2e/components.spec.ts`

---

#### H1: Dashboard KPI Cards

**Steps:**
1. Login → Admin dashboard
2. Verify KPI cards show:
   - Total Projects count matches DB
   - Total Suppliers count matches DB
   - Active Surveys count matches DB
   - Total Responses count matches DB
3. Numbers update immediately when new response created (mock or real)

**Time:** 5 min

---

#### H2: Project Form Validation

**Steps:**
1. Navigate to Create Project
2. Try submit empty → required field errors
3. Enter invalid URL (not https://) → URL format error
4. Enter valid data → success, project created

**Time:** 5 min

---

#### H3: Supplier Form Validation

**Steps:**
1. Create supplier with invalid email → validation error
2. Enter negative quota → error or clamp to 0?
3. Enter valid data → success

**Time:** 5 min

---

#### H4: Link Generator

**Steps:**
1. Go to Link Generation page
2. Select project TEST_VALID, supplier SUP_VALID, enter UID
3. Generate → URL format: `http://localhost:3000/r/TEST_VALID/SUP_VALID/UID123`
4. Copy link → should work in new tab

**Time:** 5 min

---

#### H5: Responsive Layout

**Steps:**
1. Use Playwright viewport emulation:
   - Mobile (375×667)
   - Tablet (768×1024)
   - Desktop (1920×1080)
2. Verify admin dashboard renders correctly, no horizontal scroll
3. Verify tables scroll horizontally if needed but stay contained

**Time:** 8 min

---

**TIME:** ~30 min

---

**GROUP H COMPLETE:** UI components validated

---

### GROUP I: E2E TESTS - SECURITY SCENARIOS (5 tasks)

**Test File:** `tests/e2e/security.spec.ts`

---

#### I1: XSS Attempt in Project Name

**Steps:**
1. As admin, create project with name: `<script>alert('XSS')</script>`
2. Save → View in project list
3. Verify script NOT executed (no alert)
4. Verify text escaped correctly (shows literal `<script>`)

**Time:** 5 min

---

#### I2: CSRF Protection

**Steps:**
1. Attempt POST to `/api/admin/projects` without CSRF token (if using CSRF middleware)
2. Expect 403 or rejection
3. With valid token from form → succeeds

**Note:** PanelFlow may not use CSRF tokens if using session-based auth. Adjust test accordingly.

**Time:** 5 min

---

#### I3: Session Timeout

**Steps:**
1. Login as admin
2. Wait (or mock) session expiration (e.g., 24h or configured timeout)
3. Refresh admin page → redirected to login

**Time:** 10 min (includes waiting or mocking)

---

#### I4: Direct Access to Admin Without Login

**Steps:**
1. Ensure NOT logged in
2. `page.goto('/admin')`
3. Expect redirect to `/login`

**Time:** 2 min

---

#### I5: Cookie Flags Validation

**Steps:**
1. Login → capture `session` cookie
2. Inspect cookie attributes:
   - `HttpOnly` = true
   - `Secure` = true (in production)
   - `SameSite` = 'Strict' or 'Lax'
3. In development, `Secure` may be false, but should be set in production config

**Time:** 5 min

---

**TIME:** ~25 min

---

**GROUP I COMPLETE:** Security scenarios validated

---

### GROUP J: PERFORMANCE & LOAD TESTS (10 tasks)

**Test File:** `tests/performance/load.spec.ts` (or separate `.js` scripts)

---

#### J1-J5: Load Testing with Artillery/K6

**Setup:** Install `artillery` or `k6`

**J1: 100 concurrent entries for same project**
```bash
artillery quick --count 100 -n 20 http://localhost:3000/r/TEST_VALID/SUP_VALID/UIDLOAD
```
**Assert:** No crashes, all responses 302, throttle triggers for excess requests.

**J2: 50 concurrent callbacks**
```bash
artillery quick --count 50 -n 1 http://localhost:3000/api/callback?session=...&type=complete
```
**Assert:** All callbacks succeed, quota_used increments exactly 50.

**J3: Database connection pool exhaustion**
**Goal:** Flood with >pool size connections, verify graceful rejection (queue or error).

**J4: Memory leak detection**
**Goal:** Run 1000 requests, take heap snapshot before/after, compare.

**J5: Admin dashboard load with 1000 responses**
**Assert:** Page loads < 2000ms, no jank.

---

#### J6-J10: Benchmark Tests

**J6: Entry endpoint p95 latency < 100ms**
**J7: Callback endpoint p95 latency < 200ms**
**J8: Full E2E flow completes < 5s**
**J9: Admin dashboard renders < 2s**
**J10: Database query performance (index usage)**

---

**TIME:** ~60 min (load tests may take longer)

---

**GROUP J COMPLETE:** Performance validated

---

### GROUP K: SECURITY SCANS (10 tasks)

**Description:** Static and dynamic security analysis.

---

#### K1-K5: Static Analysis (Manual/Grep)

**K1: Search for SQL injection patterns:**
```bash
grep -r "query.*\+.*SELECT" lib/ app/ --include="*.ts" --include="*.js"
# Should only find parameterized queries with $1, $2, etc.
```
**Time:** 5 min

**K2: Search for hardcoded secrets:**
```bash
grep -r "password\|key\|secret\|token" lib/ app/ --include="*.ts" --include="*.js" | grep -v ".env"
```
**Assert:** No real credentials found, only placeholders or env var references.

**K3: Search for unsafe `eval`:**
```bash
grep -r "eval(" app/ lib/ --include="*.ts" --include="*.js"
```
**Assert:** None found.

**K4: Search for `dangerouslySetInnerHTML`:**
```bash
grep -r "dangerouslySetInnerHTML" app/ components/ --include="*.tsx"
```
**Assert:** None found, or only with sanitized content.

**K5: Verify all API routes have auth:**
```bash
grep -r "export async function GET\|POST" app/api/ --include="*.ts" | wc -l  # count all
grep -r "getServerSession\|auth\|requireAuth" app/api/ --include="*.ts" | wc -l  # count protected
```
**Assert:** All API routes check authentication.

---

#### K6-K10: Dynamic Security Tests

**K6: HMAC validation with tampered payload**
- Generate valid HMAC
- Modify one character in payload
- Call `/api/callback` with tampered signature
- Expect 403

**K7: Rate limiting enforcement**
- Make 4 requests from same IP to same project within 60s
- Verify 4th blocked (status 429 or redirect)

**K8: Session cookie flags check**
- Capture Set-Cookie header from login response
- Verify `HttpOnly`, `Secure`, `SameSite` present

**K9: Duplicate UID detection across case**
- Entry with `TestUID123`
- Entry with `testuid123` → should block

**K10: Audit log completeness**
- Trigger 10 different routing events
- Count audit logs created → should be 10, no missing

---

**TIME:** ~60 min

---

**GROUP K COMPLETE:** Security scans passed

---

### GROUP L: SYSTEMATIC DEBUGGING (ON-DEMAND)

**Trigger:** Whenever ANY test fails

**Invocation:** IMMEDIATELY invoke `superpowers:systematic-debugging`

**Process:**

1. **Gather Evidence**
   - Run failing test in isolation with verbose logging
   - Capture console output, network traces (if E2E), screenshots
   - Note test file, line number, error message

2. **Create Bug Document** in `docs/bugs/YYYY-MM-DD-<shortdesc>.md`
   - Failing test code
   - Observed vs expected behavior
   - Stack trace
   - Relevant logs
   - Environment details (OS, Node version, DB state)

3. **Isolate Reproduction**
   - Create minimal reproducer (separate test or script)
   - Verify it reproduces 100% of time

4. **Formulate Hypotheses**
   - List 2-3 possible root causes
   - Rank by likelihood

5. **Test Hypotheses Systematically**
   - Add debug logging to narrow down
   - Check database state
   - Check network traffic
   - Check middleware execution order

6. **Implement Fix Using TDD**
   - Write test that captures the bug (already failing)
   - Implement minimal fix in application code
   - Verify test passes
   - Refactor if needed

7. **Update Bug Doc**
   - Root cause identified
   - Fix implemented
   - Commits: `fix: <description>`
   - Re-run all affected tests (regression check)

8. **Proceed to Next Task**

**Time per failure:** 15-30 min depending on complexity

---

## Execution Timeline (4-Agent Parallel)

| Phase | Duration | Agents | Output |
|-------|----------|--------|--------|
| Group A (Infrastructure) | 1 hour | 1 | Test harness ready |
| Groups B+C+D+E (Unit+Integration) | 2 hours | 4 agents parallel | Core logic tests written and passing |
| Groups F (Router Integration) | 1 hour | 1 or 2 | Router tests passing |
| Groups G+H+I (E2E) | 2 hours | 3 agents parallel | Full flows green |
| Groups J+K (Perf+Security) | 1.5 hours | 2 agents parallel | Benchmarks & scans passed |
| Group L (Debugging) | **as needed** | 1 per failure | Bug fixes |
| Final Verification | 30 min | 1 | Sign-off document |

**Wall Time (ideal):** ~7 hours (with 4-way parallel)
**Wall Time (with debugging):** ~8-11 hours

---

## Final Deliverables

After all groups complete:

1. ✅ All tests passing (100%)
2. ✅ Coverage ≥90% (`jest --coverage`)
3. ✅ Zero lint errors (`npm run lint`)
4. ✅ Zero TypeScript errors (`npx tsc --noEmit`)
5. ✅ Security scans clean
6. ✅ Performance benchmarks met

Then:
- Invoke `superpowers:verification-before-completion`
- Generate `docs/deployment/SIGN-OFF-2026-04-20.md`
- Create git tag: `production-ready-2026-04-20`
- Ready for PR merge / deployment

---

## Checklist for Completion

**Before claiming validation done, verify:**

- [ ] `superpowers:brainstorming` used (this design)
- [ ] `superpowers:writing-plans` used (this plan)
- [ ] `superpowers:test-driven-development` used for all code changes during tests
- [ ] `superpowers:dispatching-parallel-agents` used for Groups B-K
- [ ] `superpowers:systematic-debugging` invoked for each failure (if any)
- [ ] `superpowers:verification-before-completion` used for final sign-off
- [ ] `superpowers:requesting-code-review` invoked for any code changes made
- [ ] All test groups (A-K) marked complete with evidence

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2026-04-20 | 1.0 | Initial implementation plan with 150+ tasks, parallel groups, TDD workflow |

---

**Ready to Execute.**

**Next Command:**  
`/superpowers:subagent-driven-development` or dispatch agents for Groups B, C, D, E in parallel.
