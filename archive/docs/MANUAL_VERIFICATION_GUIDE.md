# Manual Verification Guide

**Server:** http://localhost:3001  
**Health:** ✅ Healthy (connected to Supabase)

---

## Test 1: Direct Flow

1. Open browser to:
   ```
   http://localhost:3001/start/TEST_SRC_978510
   ```

2. Expected behavior:
   - You should see the survey landing page with a **PanelFlow** URL
   - Complete the survey (click through)
   - Final page should show "Complete" with PanelFlow branding
   - URL should be `/redirect/complete` (internal landing)

3. Verify database:
   ```bash
   # Check the latest response record
   # In Supabase dashboard or via SQL:
   SELECT id, project_code, uid, source, status, clickid, completed_at
   FROM responses
   WHERE project_code = 'TEST_SRC_978510'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   - `source` should be **'direct'**
   - `status` should be **'complete'**
   - `clickid` and `oi_session` should have values

---

## Test 2: Supplier Flow

1. Open browser to:
   ```
   http://localhost:3001/start/TEST_SRC_978510?supplier=supp_test_src_1776390978514
   ```

2. Expected behavior:
   - Survey landing page should load
   - Complete the survey
   - Final redirect should go to **supplier's external landing page**
     (configured in `suppliers.complete_redirect_url`)
   - You'll be redirected away from localhost:3001

3. Verify database:
   ```sql
   SELECT id, project_code, uid, supplier_token, source, status
   FROM responses
   WHERE project_code = 'TEST_SRC_978510'
     AND supplier_token = 'supp_test_src_1776390978514'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   - `source` should be **'supplier'**
   - `supplier_token` should match
   - `status` should be **'complete'**

---

## Test 3: Dashboard (Admin)

1. Login at: http://localhost:3001/login
2. Default credentials:
   - Email: `admin@opinioninsights.com`
   - Password: `admin123`
3. Navigate to dashboard: http://localhost:3001/admin/dashboard
4. Verify:
   - Stats cards display (Total Projects, Total Responses, etc.)
   - Recent activity visible
   - No errors in browser console

---

## Test 4: Security Headers

1. Open DevTools → Network tab
2. Refresh any page on localhost:3001
3. Click on the main document request
4. Check response headers for:
   - `Content-Security-Policy` (should include `'nonce-...'`)
   - `Strict-Transport-Security` (only on HTTPS, not localhost)
   - `Cross-Origin-Opener-Policy: same-origin`
   - `Cross-Origin-Embedder-Policy: require-corp`
   - `Permissions-Policy: ...magnetometer=()...` (includes all sensors)
   - `x-csp-nonce` (custom header with 32-char hex)

---

## Quick Database Verification Queries

```sql
-- 1. Check latest responses with source
SELECT
  created_at,
  project_code,
  uid,
  supplier_token,
  source,
  status
FROM responses
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check audit logs for entry events
SELECT
  event_type,
  payload->>'project_id' as project_id,
  payload->>'response_id' as response_id,
  created_at
FROM audit_logs
WHERE event_type = 'ROUTING_ENTRY'
ORDER BY created_at DESC
LIMIT 5;

-- 3. Verify supplier configuration
SELECT
  supplier_token,
  name,
  complete_redirect_url,
  terminate_redirect_url
FROM suppliers
WHERE supplier_token IN ('supp_test_src_1776390978514', 'DYN01');
```

---

## What to Report

After testing, note:
- [ ] Direct flow completed successfully
- [ ] Database shows source='direct'
- [ ] Supplier flow completed successfully
- [ ] Database shows source='supplier'
- [ ] Dashboard loads without errors
- [ ] Security headers present (at least CSP, COOP, COEP)

---

**If any test fails:** Screenshot the error and note the URL/action being performed.

**If all tests pass:** We're ready to deploy! 🚀
