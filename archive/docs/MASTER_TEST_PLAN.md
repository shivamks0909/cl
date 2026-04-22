# Master Test & Validation Plan
## Survey Routing Platform - Full End-to-End Testing

**Date:** 2026-04-20
**Status:** IN PROGRESS
**Deployment:** https://april-ilety69y8-cypher1446-oss-projects.vercel.app

---

## 🎯 Objectives

1. **Full Flow Test**: Test complete survey routing from link generation to termination
2. **Supplier Duplicate Detection**: Verify same supplier UID detection works
3. **Termination → Landing**: Ensure terminated surveys redirect properly
4. **Problem Identification**: Find any gaps or failures
5. **Fix & Redeploy**: Apply fixes and deploy to production
6. **Final Validation**: Confirm all fixes work

---

## 📋 Test Checklist

### Phase 1: Pre-Test Preparation
- [x] Build verified locally
- [x] Supabase database connected
- [x] Production deployed
- [ ] Identify test project (TEST_SINGLE or create new)
- [ ] Verify project configuration in DB
- [ ] Generate test supplier links

### Phase 2: Core Flow Tests
- [ ] **Test 1: Fresh Respondent Flow**
  - Generate link: `/r/TEST_SINGLE/DYN01/UID123`
  - Verify entry → response record created
  - Complete callback → status changes to 'complete'
  - Check audit logs

- [ ] **Test 2: Duplicate UID Detection**
  - Same UID, same project → should redirect to `/duplicate-string`
  - Verify audit log entry for duplicate
  - Check response status

- [ ] **Test 3: Quota Exhaustion**
  - Supplier link with quota=1
  - First request → success
  - Second request → redirect to `/quotafull`
  - Verify quota tracking

- [ ] **Test 4: IP Throttling**
  - 3 requests from same IP within 1 minute
  - 4th request → redirect to `/security-terminate`
  - Verify IP count tracking

- [ ] **Test 5: Termination Flow**
  - Access `/terminate?reason=...`
  - Should redirect to landing page
  - Check response status updated

- [ ] **Test 6: Invalid Project**
  - Use non-existent project code
  - Should redirect to `/paused?title=PROJECT_NOT_FOUND`

- [ ] **Test 7: Paused Project**
  - Set project status='paused'
  - Access link → redirect to `/paused?title=PROJECT_PAUSED`

### Phase 3: Supplier-Specific Tests
- [ ] **Test 8: Supplier Token Validation**
  - Generate supplier-specific link with token
  - Verify token recognized
  - Test invalid token → redirect

- [ ] **Test 9: Supplier Quota Tracking**
  - Check `supplier_project_links.quota_used`
  - Increments correctly per completion
  - Respects `quota_allocated` limit

- [ ] **Test 10: Country-Based Routing**
  - Test with different country codes
  - Verify GeoIP detection
  - Check country-specific quotas if applicable

### Phase 4: S2S Callback Tests
- [ ] **Test 11: HMAC Signature Verification**
  - Generate valid signature
  - Callback should succeed (200)
  - Test invalid signature → 403

- [ ] **Test 12: Callback Types**
  - `complete` → status='complete'
  - `terminate` → status='terminated'
  - `quotafull` → status='quota_full'
  - Verify each updates correctly

### Phase 5: Database Integrity
- [ ] Check all responses have valid project_code
- [ ] Verify foreign key relationships
- [ ] Audit log completeness
- [ ] Session token uniqueness
- [ ] No orphaned records

### Phase 6: Performance & Security
- [ ] Response time < 500ms for routing
- [ ] Database query performance
- [ ] RLS policies enforced
- [ ] No sensitive data in logs

---

## 🛠️ Tools & Scripts

**Existing test scripts:**
- `test-routing.js` - Basic routing tests
- `test-callback.js` - Callback flow tests
- `test-quota-concurrency.ts` - Quota & concurrency
- `test-security.js` - Security tests
- `e2e-smoke-tests.js` - Smoke tests

**Manual test URLs:**
- Production: `https://april-ilety69y8-cypher1446-oss-projects.vercel.app`
- Health: `/api/health`
- Routing: `/r/[code]/[...slug]`
- Callback: `/api/callback`
- S2S Callback: `/api/s2s/callback`

---

## 🔍 Expected Behavior

| Scenario | Expected Result |
|----------|----------------|
| Valid link | 302 redirect + cookies set |
| Duplicate UID | 302 → `/duplicate-string` |
| Quota full | 302 → `/quotafull` |
| IP throttled | 302 → `/security-terminate` |
| Invalid project | 302 → `/paused?title=PROJECT_NOT_FOUND` |
| Paused project | 302 → `/paused?title=PROJECT_PAUSED` |
| Valid callback | 200 + status updated |
| Invalid HMAC | 403 Forbidden |

---

## 🐛 Known Issues to Verify

1. **Supabase URL Mismatch**: `.env` has old URL, `.env.local` has correct
2. **Health Endpoint**: May require Vercel SSO auth
3. **Supplier Duplicate Detection**: Needs verification
4. **Termination Landing**: Verify redirect works

---

## 📊 Success Criteria

✅ All 12 core tests pass
✅ No duplicate UID bypasses
✅ Quota management accurate
✅ Callback HMAC verification works
✅ Database integrity maintained
✅ Production deployment healthy

---

## 🚀 Execution Plan

1. Review code for supplier duplicate logic
2. Run existing test suite
3. Manual end-to-end testing via browser
4. Identify failures
5. Fix issues
6. Redeploy to production
7. Final verification

---

**Next Step:** Begin code review of routing and supplier detection logic.
