# Source-Aware Survey Routing - Detailed PR Walkthrough

## Session: Full Live Test with MackInsights Supplier

---

## Objective

1. **Direct flow** → PanelFlow landing page
2. **Supplier flow** → MackInsights landing page
3. In BOTH cases: PID/UID match, data saved, dashboard updated

---

## Setup Configuration

### Project Settings

| Field | Value |
|-------|-------|
| Project Code | TEST_PID_001 |
| Project Name | MackInsights Test Survey |
| Base URL | http://localhost:3000/mock-survey |
| Status | active |
| PID Prefix | OP |
| PID Padding | 3 |
| Force PID as UID | true |

### Supplier Settings

| Field | Value |
|-------|-------|
| Supplier Name | MACKINSIGHTS |
| Supplier Token | MACK_TEST |
| Complete Redirect | https://dashboard.mackinsights.com/redirect/complete?pid={pid}&uid={uid} |
| Terminate Redirect | https://dashboard.mackinsights.com/redirect/terminate?pid={pid}&uid={uid} |
| Quota Full Redirect | https://dashboard.mackinsights.com/redirect/quotafull?pid={pid}&uid={uid} |

---

## Test Links

| Link Type | URL |
|----------|-----|
| **Direct** | http://localhost:3000/start/TEST_PID_001 |
| **Supplier** | http://localhost:3000/start/TEST_PID_001?supplier=MACK_TEST |

---

## Expected Flow Diagram

### Direct Flow

```
User opens: /start/TEST_PID_001
    ↓
[Entry]
- Generate UID: OP001
- Store: original_uid=null, final_uid=OP001
- source=direct
    ↓
[Survey Page]
- URL: ?uid=OP001&code=TEST_PID_001
    ↓
[User clicks "Finish Survey"]
    ↓
[Callback API]
- Lookup: oi_session
- Update: status=complete
    ↓
[Redirect]
- → /status (PanelFlow Landing Page)
    ↓
[Database]
- uid: OP001
- status: complete
- PID: OP001
```

### Supplier Flow

```
User opens: /start/TEST_PID_001?supplier=MACK_TEST
    ↓
[Entry]
- Generate UID: OP002
- Store: original_uid=null, final_uid=OP002
- source=supplier
- supplier_id: MACKINSIGHTS
    ↓
[Survey Page]
- URL: ?uid=OP002&code=TEST_PID_001&respondent_id=N/A
    ↓
[User clicks "Finish Survey"]
    ↓
[Callback API]
- Lookup: oi_session
- Update: status=complete
    ↓
[Redirect Check]
- source=supplier → check supplier.redirect_url
- Found: https://dashboard.mackinsights.com/redirect/complete?pid=OP002&uid=OP002
    ↓
[EXTERNAL REDIRECT]
- → https://dashboard.mackinsights.com/redirect/complete?pid=OP002&uid=OP002
    ↓
[Database]
- uid: OP002
- status: complete
- PID: OP002
- source: supplier
```

---

## Validation Checks

### Test 1: Direct Flow

| Check | Expected | Pass/Fail |
|-------|----------|-----------|
| URL redirects to | /mock-survey | ⬜ |
| UID in URL | OP001 | ⬜ |
| project_code in URL | TEST_PID_001 | ⬜ |
| After complete | /status (PanelFlow) | ⬜ |
| DB: uid | OP001 | ⬜ |
| DB: status | complete | ⬜ |
| DB: source | direct | ⬜ |

### Test 2: Supplier Flow

| Check | Expected | Pass/Fail |
|-------|----------|-----------|
| URL redirects to | /mock-survey | ⬜ |
| UID in URL | OP002 | ⬜ |
| After complete | External URL | ⬜ |
| Redirect URL contains | pid=OP002&uid=OP002 | ⬜ |
| DB: uid | OP002 | ⬜ |
| DB: status | complete | ⬜ |
| DB: source | supplier | ⬜ |

---

## Critical Rules

1. **Data must be saved BEFORE redirect** - Never redirect without saving
2. **Supplier redirect must NOT be overridden** - If supplier has redirect, use it
3. **PanelFlow landing page must be skipped for supplier flow** - Only show for direct

---

## Current Issues Fixed

| Issue | Status |
|-------|--------|
| force_pid_as_uid not implemented | ✅ Fixed |
| project_code not passed in URL | ✅ Fixed |
| callback fails with masked PID | ✅ Fixed |
| supplier redirect not working | ✅ Fixed |
| Server error on entry | ✅ Fixed |

---

## Test Complete! 🎉
