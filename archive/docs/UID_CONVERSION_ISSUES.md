# UID Conversion Feature - Issues Report

## Current Status: ❌ NOT WORKING

## Issues Found:

### 1. `force_pid_as_uid` NOT IMPLEMENTED in Code
- **Location**: `lib/db.ts` line 55
- **Problem**: Database field exist karta hai, lekin `tracking-service.ts` me use nahi kiya gaya
- **Fix Needed**: Implement logic in tracking-service.ts

### 2. Masked UID Generation Missing
- **Expected Flow**:
  - Supplier UID: `test01`
  - → Generate Masked UID: `OPGHUS01` (using PID logic)
  - → Send to client: `OPGHUS01`
- **Current**: Random UUID hi bheja ja raha hai client ko

### 3. UID Mapping Storage Fields Missing
- **Responses Table Issues**:
  - `client_uid_sent` (ORIGINAL supplier UID): Empty
  - `client_uid` (MASKED UID): Not stored
  - `user_uid`: Stores random UUID, not masked

### 4. Project Configuration Not Working
- **Current Project Settings**:
  - `client_uid_param`: '' (NOT used)
  - `uid_params`: null (NOT used)  
  - `client_pid_param`: '' (NOT used)
  - `force_pid_as_uid`: 0 (NOT checked)

### 5. URL Generation Default Behavior
- **Current**: Always uses `uid` param with random UUID
- **Expected**: Use `client_uid_param` if configured
- **Missing**: Custom parameter mapping

---

## Required Fixes:

### A. Tracking Service Changes:
1. Check `project.force_pid_as_uid`
2. If true, use generated PID as UID instead of random
3. Store original UID in `client_uid_sent`
4. Store masked UID in `client_uid` or `user_uid`

### B. Completion Endpoint Changes:
1. Lookup by masked UID (from client)
2. Find original UID from `client_uid_sent`
3. Update record correctly

### C. URL Build Logic:
1. Use `client_uid_param` if set
2. Use custom mapping from `uid_params`

---

## Test Configuration Required:

```sql
-- Project Settings
client_uid_param: 'respondent_id'
client_pid_param: 'pid'
force_pid_as_uid: 1
pid_prefix: 'OP'
pid_padding: 3

-- Expected URL:
?respondent_id=OP001&pid=OP001
```

---

## Summary:
| Issue | Location | Status |
|-------|----------|--------|
| force_pid_as_uid not checked | tracking-service.ts | ❌ Missing |
| Masked UID not generated | buildUrl() | ❌ Missing |
| Original UID not stored | responses insert | ❌ Missing |
| Reverse lookup broken | /complete endpoint | ❌ Missing |
| Project settings ignored | buildUrl() | ❌ Missing |
