# PanelFlow Enhanced Pre-Production Validation - Design Document

**Date:** 2026-04-20
**Phase:** 1 - Brainstorming & Design
**Methodology:** `superpowers:brainstorming`
**Status:** DRAFT - Awaiting approval to proceed to implementation plan

---

## 1. Executive Overview

This document defines the comprehensive validation strategy for PanelFlow's production deployment. It maps every critical user journey, identifies failure modes, specifies data integrity checks, and establishes security boundaries to ensure zero-gap quality assurance.

**Goal:** Achieve 100% test pass rate, ≥90% code coverage, and zero security vulnerabilities before production.

---

## 2. Critical User Journeys (CJU)

### 2.1 Direct Link Flow (Internal Tracking)

**Path:**
`GET /r/{project_code}/{supplier}/{uid}` → Entry → Survey → `/api/callback?session=...&type=complete` → `/redirect/complete` (internal PanelFlow page)

**Critical Checkpoints:**
1. **Entry Point**: Request hits `/r/[code]/[...slug]/route.ts`, extracts code/supplier/uid
2. **Quota Check**: `supplier_project_links.quota_used < quota_allocated`
3. **Throttle Check**: IP has <3 requests in last 60s for this project
4. **Duplicate Check**: No existing `responses` with same `(project_id, uid)`
5. **Country Check**: If multi-country, validate country against active countries
6. **Cookie Setting**: Set `last_uid`, `last_sid`, `last_pid` cookies
7. **Audit Log**: `entry_created` event with full context
8. **Callback**: HMAC-verified callback updates response to `complete`
9. **Dashboard**: Admin dashboard reflects new response count

**Expected Database State:**
```sql
responses: row with source='direct', status='complete', oi_session=valid-uuid
supplier_project_links: quota_used incremented by 1
audit_logs: entry_created, callback_success events
```

---

### 2.2 Supplier Flow (External Tracking)

**Path:**
`GET /r/{code}/{supplier}/{uid}` (with supplier token stored in session) → Entry → External Survey → `/api/callback?session=...&type=complete` → Supplier's redirect URL

**Differences from Direct Flow:**
- `source='supplier'` in responses
- Final redirect goes to `supplier.complete_redirect_url` (not PanelFlow internal page)
- PanelFlow landing page **SKIPPED** (no intermediate `/complete` page)
- Supplier UID captured separately from client UID sent

**Critical Checkpoints:**
1. **Supplier Token Validation**: Session contains valid `supplier_token` linked to supplier
2. **Supplier UID Capture**: `supplier_uid_incoming` stored before UID conversion
3. **UID Mapping**: Client UID Sent shows post-mapping value
4. **Landing Page Bypass**: After callback, redirect directly to supplier URL (not `/complete`)

---

### 2.3 Quota Enforcement Flow

**Scenario:** Supplier reaches allocated quota during active survey period

**Flow:**
1. Entry allowed when `quota_used < quota_allocated` (even if `quota_allocated = 0` at launch)
2. **Quota full triggered ONLY on callback** (not on entry)
3. Callback with `type=quotafull` redirects to:
   - Supplier's `complete_redirect_url` (if configured) OR
   - PanelFlow `/quotafull` page (default)

**Critical Checkpoint:** `test_quota_full_not_triggered_on_launch` - Zero quota does NOT block entry (only callback triggers quota full)

---

### 2.4 Admin Dashboard Flows

**Views:**
- Projects CRUD (create, edit, delete, list, detail)
- Suppliers CRUD
- Response table with filtering/search
- Audit log viewer with pagination
- Link generation tool

**Critical Checkpoints:**
- All data loads without errors
- Filters work correctly
- Actions (edit/delete) require confirmation
- API endpoints enforce authentication
- No sensitive data exposed in client bundles

---

## 3. Failure Modes & Edge Cases

### 3.1 Quota Miscalculation

| Scenario | Risk | Test |
|----------|------|------|
| Concurrent callbacks | Over-increment quota_used | `test_quota_concurrency_stress` |
| Race condition entry + callback | Double count | `test_entry_callback_race_condition` |
| Quota exactly reached | Off-by-one error | `test_quota_boundary_exact` |
| Callback after quota full | Status change blocked | `test_quotafull_callback_idempotent` |

---

### 3.2 IP Throttle Bypass

| Attack Vector | Risk | Mitigation | Test |
|---------------|------|------------|------|
| X-Forwarded-For spoofing | Bypass throttle | Use `getClientIp()` with trusted proxy list | `test_throttle_ignores_xff_spoofing` |
| Header variations (x-real-ip) | Bypass throttle | Normalize to standard header chain | `test_throttle_consistent_ip_detection` |
| Cookie-based evasion | Bypass throttle | Throttle independent of cookies | `test_throttle_ip_only_not_cookie` |

---

### 3.3 Duplicate UID Detection

| Edge Case | Risk | Test |
|-----------|------|------|
| Case sensitivity (UID123 vs uid123) | Duplicate bypass | `test_duplicate_uid_case_insensitive` |
| Whitespace variations (UID 123 vs UID123) | Duplicate bypass | `test_duplicate_uid_trimmed` |
| Unicode homoglyphs | Duplicate bypass | `test_duplicate_uid_unicode_normalization` |
| UID reused after project archiving | Duplicate bypass | `test_duplicate_uid_enforced_indefinitely` |

---

### 3.4 GeoIP Failures

| Scenario | Risk | Test |
|----------|------|------|
| ip-api.com rate limit (45/min free tier) | Country validation fails | `test_geoip_fallback_to_maxmind` |
| Offline (no internet) | Country validation fails | `test_geoip_fallback_to_header` |
| MaxMind DB missing | Country validation fails | `test_geoip_fallback_to_none` |
| Cloudflare/Vercel headers present | Should use trusted headers | `test_geoip_uses_vercel_headers_first` |

---

### 3.5 HMAC & Callback Security

| Threat | Risk | Test |
|--------|------|------|
| Missing HMAC signature | Fake callback accepted | `test_callback_requires_hmac_signature` |
| Invalid HMAC signature | Fake callback accepted | `test_callback_rejects_bad_hmac` |
| Expired HMAC timestamp | Replay attack | `test_callback_hmac_expiration_enforced` |
| Session hijacking | Unauthorized callback | `test_callback_session_validation` |
| Duplicate callback | Double status update | `test_callback_idempotent_on_complete` |

---

### 3.6 Race Conditions

| Concurrent Event | Risk | Test |
|------------------|------|------|
| Two entries for same UID | Duplicate detection bypass | `test_race_duplicate_uid` |
| Entry + callback simultaenous | Quota miscount | `test_race_quota_increment` |
| Multiple callbacks same response | Duplicate audit logs | `test_race_callback_idempotency` |

---

## 4. Data Integrity Verification

### 4.1 Response Table Field Validation

| Field | Source | Validation Rule | Test |
|-------|--------|-----------------|------|
| `source` | Router detection | `'direct'` or `'supplier'` | `test_response_source_correct` |
| `supplier_uid_incoming` | Session/cookie | Raw supplier UID pre-mapping | `test_supplier_uid_captured` |
| `uid` | URL param | Post-mapping client UID | `test_client_uid_mapped` |
| `status` | Callback type | `'complete'`, `'terminate'`, `'quotafull'` | `test_response_status_updated` |
| `quota_charged` | Boolean | `true` if callback charged quota | `test_quota_charged_flag` |
| `audit_logs` | Async logging | One per event, never dropped | `test_audit_log_completeness` |

---

### 4.2 Quota Accounting

**Invariant:** `supplier_project_links.quota_used` = count of `responses` with `(supplier_id, project_id, quota_charged=true)`

**Test Cases:**
1. Initial state: `quota_used` matches existing charged responses
2. After entry: `quota_used` unchanged (quota only charged on callback)
3. After complete callback: `quota_used` increments by 1
4. After terminate callback: `quota_used` unchanged (no quota charged)
5. After quotafull callback: `quota_used` unchanged (no quota charged)

---

## 5. Security Test Matrix

### 5.1 Authentication & Authorization

| Test | Expected |
|------|----------|
| `/admin/*` without session | 401 or redirect to `/login` |
| `/api/admin/*` without valid JWT | 401 |
| `/api/callback` with fake HMAC | 403 |
| `/api/callback` with expired session | 403 |

---

### 5.2 SQL Injection Prevention

| Vector | Test | Expected |
|--------|------|----------|
| `uid` param: `' OR '1'='1` | Parameterized query should sanitize | No error, no data leak |
| `code` param: `TEST; DROP TABLE responses` | Parameterized query | No error, table intact |
| `supplier` param: `admin'--` | Parameterized query | No comment bypass |

---

### 5.3 XSS Prevention

| Vector | Test | Expected |
|--------|------|----------|
| UID reflected in admin UI | `<script>alert(1)</script>` | Escaped, no execution |
| Project name in dashboard | `<img src=x onerror=alert(1)>` | Escaped |
| Audit log payload display | JSON with malicious strings | Properly escaped |

---

## 6. Test Categories & Coverage

### 6.1 Unit Tests (Jest) - 40 tests

**Database Layer (10 tests):**
- Unified DB fallback logic (InsForge → SQLite)
- Parameterized query execution
- Connection pooling
- Transaction atomicity
- Error propagation

**Service Layer (20 tests):**
- Audit service (log, retrieve, paginate)
- Tracking service (entry validation, response creation)
- GeoIP service (provider selection, fallback chain)
- Redirect resolver (direct vs supplier logic)
- Security middleware (rate limiting state)

**Utility Layer (10 tests):**
- IP extraction from headers
- UID sanitization/normalization
- HMAC signature generation/verification
- Country validation logic
- Cookie parsing

---

### 6.2 Integration Tests (Jest + Supertest) - 30 tests

**API Endpoints (15 tests):**
- `GET /api/health` returns `{db_source, latency_ms}`
- `GET /api/callback` with valid HMAC → 200, updates response
- `GET /api/callback` with invalid HMAC → 403
- `GET /api/admin/projects` → requires auth, returns JSON
- `POST /api/admin/projects` → creates project
- `GET /api/respondent-stats/:session` → returns stats

**Router Integration (15 tests):**
- Unified router (`/r/[code]/[...slug]`):
  - Valid direct entry → 302 to external survey, sets cookies
  - Valid supplier entry → 302, source='supplier'
  - Quota exceeded → 302 to `/quotafull`
  - Duplicate UID → 302 to `/duplicate-string`
  - IP throttled → 302 to `/security-terminate`
  - Paused project → 302 to `/paused`
  - Invalid project → 302 to `/paused?title=PROJECT_NOT_FOUND`
  - Multi-country inactive → 302 to `/country-unavailable`

---

### 6.3 E2E Tests (Playwright) - 20 tests

**Full Flow Scenarios (10 tests):**
1. Direct flow end-to-end: entry → survey → callback → internal complete page
2. Supplier flow end-to-end: entry → external → callback → supplier landing
3. Quota full flow: entry → survey → callback → quota full page
4. Duplicate UID flow: first entry succeeds, second blocks
5. IP throttle flow: 4 rapid entries, 4th blocked
6. Admin login flow: login → dashboard → logout
7. Project creation flow: admin creates project → visible in list
8. Supplier creation flow: admin creates supplier → linkable
9. Response viewing: admin views responses table → filters work
10. Audit log viewing: admin sees audit trail with correct events

**UI Component Tests (5 tests):**
- Dashboard KPI cards display correct counts
- Project form validation (required fields, URL format)
- Supplier form with quota input validation
- Link generator produces correct URLs
- Responsive layout on mobile/tablet

**Security Tests (5 tests):**
- XSS attempt in project name → escaped in UI
- CSRF token missing on state-changing actions → rejected
- Session timeout → redirected to login
- Direct URL access to `/admin` without login → blocked
- Cookie flags: HttpOnly, Secure, SameSite properly set

---

### 6.4 Performance & Load Tests - 10 tests

**Load Testing (5 tests):**
- 100 concurrent entries for same project → no crashes, throttle works
- 50 concurrent callbacks → no deadlocks, quota accurate
- Database connection pool exhaustion → graceful rejection
- Memory leak detection: 1000 requests → stable memory

**Benchmark Tests (5 tests):**
- Entry response time p95 < 100ms
- Callback response time p95 < 200ms
- Admin dashboard load < 2s with 1000 responses
- Full E2E flow completes < 5s (test environment)

---

### 6.5 Security Scans - 10 tests

**Static Analysis (5 tests):**
- No SQL injection patterns in codebase
- No hardcoded secrets ( grep for passwords, keys )
- No unsafe `eval()` or `dangerouslySetInnerHTML`
- All API routes have authentication/rate limiting

**Dynamic Analysis (5 tests):**
- Real HMAC validation against test data
- Rate limiting actually blocks after threshold
- Session cookies have Secure, HttpOnly, SameSite flags
- Audit logs capture all routing decisions

---

**Total Test Count:** 110 tests across 5 categories

---

## 7. Acceptance Criteria

### 7.1 Functional Completeness

- [ ] All UI pages render without errors or infinite loaders
- [ ] All buttons clickable, forms submit with validation
- [ ] Direct flow: `/r/TEST/DYN01/UID123` → survey → `/redirect/complete` (internal)
- [ ] Supplier flow: supplier token preserved → external → supplier landing (no PanelFlow page)
- [ ] Quota full ONLY on callback, not on entry
- [ ] Response table accurately reflects source, UID mapping, status
- [ ] Dashboard counts update immediately after responses
- [ ] Audit log contains every routing decision with full context
- [ ] IP throttle blocks 4th request in 60s window
- [ ] Duplicate UID detection prevents reuse across time

---

### 7.2 Code Quality

- [ ] **100% of automated tests pass** (0 failures, 0 skips)
- [ ] **Test coverage ≥ 90%** (measured by `jest --coverage`)
- [ ] No lint errors: `npm run lint` passes
- [ ] Type checking: `npx tsc --noEmit` clean
- [ ] No console errors/warnings in browser (Playwright check)
- [ ] All dependencies up-to-date (no known CVEs)

---

### 7.3 Security Posture

- [ ] **Zero SQL injection vulnerabilities** (all queries parameterized)
- [ ] **Zero XSS vulnerabilities** (all user input escaped)
- [ ] HMAC verification rejects all tampered callbacks
- [ ] Session cookies: `HttpOnly`, `Secure`, `SameSite=Strict`
- [ ] Rate limiting active on all sensitive endpoints
- [ ] Duplicate UID detection across case/whitespace variations
- [ ] No secrets in client bundles (`NEXT_PUBLIC_*` only)
- [ ] Audit logs immutable once written

---

### 7.4 Data Integrity

- [ ] `quota_used` invariant holds: equals count of charged callbacks
- [ ] `responses.source` matches actual flow type (direct/supplier)
- [ ] `supplier_uid_incoming` preserved separately from mapped UID
- [ ] No orphaned audit logs (all reference valid response IDs)
- [ ] Foreign key constraints satisfied across all tables
- [ ] Timestamps accurate (server time, not client)

---

### 7.5 Performance

- [ ] API p95 latency < 200ms (verified with `curl -w '%{time_total}'`)
- [ ] Page load time < 2s on 3G network (Lighthouse)
- [ ] No memory growth after 1000 requests (heap snapshot comparison)
- [ ] Database connection pool size adequate (no exhaustion at 50 concurrent)

---

## 8. Test Implementation Strategy

### 8.1 TDD Workflow

For each test category:
1. Write failing test first (Red)
2. Implement minimal fix (Green)
3. Refactor for clarity (Refactor)
4. Commit with descriptive message
5. Move to next test

**Parallelization:** Use `superpowers:dispatching-parallel-agents` to run:
- Agent 1: Unit tests (Jest)
- Agent 2: Integration tests (Supertest)
- Agent 3: E2E tests (Playwright)
- Agent 4: Security & performance tests

---

## 9. Parallel Execution Plan

### Task Groups (Bite-Sized, 2-5 mins each)

**Group A: Test Infrastructure** (10 tasks)
- A1: Verify Jest config valid (`jest.config.js`)
- A2: Verify Playwright config (`playwright.config.ts`)
- A3: Create test database fixture for Jest
- A4: Create mock Supabase client for unit tests
- A5: Create test helper utilities (db reset, seed data)
- A6: Install Playwright browsers (`npx playwright install`)
- A7: Configure test environment variables (`.env.test`)
- A8: Create coverage reporter setup
- A9: Create parallel test runner script
- A10: Sanity check: run all tests once (expect failures)

---

**Group B: Unit Tests** (40 tasks - dispatch to Agent 1)
- B1-B10: Database layer tests
- B11-B30: Service layer tests
- B31-B40: Utility layer tests

---

**Group C: Integration Tests** (30 tasks - dispatch to Agent 2)
- C1-C15: API endpoint tests
- C16-C30: Router integration tests

---

**Group D: E2E Tests** (20 tasks - dispatch to Agent 3)
- D1-D10: Full flow scenarios
- D11-D15: UI component tests
- D16-D20: Security scenario tests

---

**Group E: Performance & Security** (20 tasks - dispatch to Agent 4)
- E1-E10: Load/benchmark tests
- E11-E15: Static security analysis
- E16-E20: Dynamic security tests

---

**Group F: Systematic Debugging** (as needed - invoke `superpowers:systematic-debugging` per failure)
- F1: For each failing test, create bug doc in `docs/bugs/`
- F2: Reproduce failure locally with isolation
- F3: Formulate hypotheses and test systematically
- F4: Implement fix using TDD
- F5: Re-run affected tests, verify pass
- F6: Update bug doc with root cause and fix

---

## 10. Verification Before Completion

**Use `superpowers:verification-before-completion` to finalize:**

For each acceptance criterion:
- [ ] Show evidence (test output, screenshots, logs)
- [ ] Verify against original PRD
- [ ] Confirm no regressions (full suite re-run)
- [ ] Update documentation
- [ ] Prepare deployment checklist

---

## 11. Deliverables

### 11.1 Artifacts to Create

1. **Design Document** (this file) → `docs/superpowers/specs/YYYY-MM-DD-panelflow-validation-design.md`
2. **Implementation Plan** → `docs/superpowers/plans/YYYY-MM-DD-panelflow-validation.md`
3. **Bug Reports** → `docs/bugs/YYYY-MM-DD-<shortdesc>.md` (one per failure)
4. **Code Review Report** → Generated by `superpowers:requesting-code-review`
5. **Final Sign-off** → `docs/deployment/SIGN-OFF-YYYY-MM-DD.md`

---

## 12. Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2026-04-20 | 1.0 | Initial design document from brainstorming phase |

---

**Next Steps:**
1. Review and approve this design
2. Invoke `superpowers:writing-plans` to generate detailed task breakdown
3. Dispatch parallel agents to execute test groups
4. Debug failures with `superpowers:systematic-debugging`
5. Finalize with `superpowers:verification-before-completion`
