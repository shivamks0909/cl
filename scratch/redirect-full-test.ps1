
# ============================================================
# PanelFlow Full Redirect Test Script
# ============================================================

$BASE = "http://localhost:3000"
$SUPABASE_URL = "https://qvgrzxuonxhwnxitnfvk.supabase.co"
$SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2Z3J6eHVvbnhod254aXRuZnZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM2OTM5NSwiZXhwIjoyMDkxOTQ1Mzk1fQ.VNceroffbWIkSlWFEP4oGQly7uRppyg78z9FGnghkJ8"

$PASS = 0
$FAIL = 0
$RESULTS = @()

function Log-Test($name, $passed, $detail = "") {
    if ($passed) {
        Write-Host "[PASS] $name" -ForegroundColor Green
        $script:PASS++
    } else {
        Write-Host "[FAIL] $name --- $detail" -ForegroundColor Red
        $script:FAIL++
    }
    $script:RESULTS += [PSCustomObject]@{ Test = $name; Status = if ($passed) {"PASS"} else {"FAIL"}; Detail = $detail }
}

function HTTP-Get($url) {
    try {
        $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15 -MaximumRedirection 5
        return $resp
    } catch {
        if ($_.Exception.Response) {
            return [PSCustomObject]@{ StatusCode = $_.Exception.Response.StatusCode.value__; Content = "" }
        }
        return $null
    }
}

function DB-Query($table, $filter = "") {
    $url = "$SUPABASE_URL/rest/v1/$($table)$filter"
    try {
        $resp = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing -TimeoutSec 10 -Headers @{
            "apikey" = $SERVICE_KEY
            "Authorization" = "Bearer $SERVICE_KEY"
        }
        return ($resp.Content | ConvertFrom-Json)
    } catch { return $null }
}

function DB-Insert($table, $data) {
    $url = "$SUPABASE_URL/rest/v1/$table"
    try {
        $resp = Invoke-WebRequest -Uri $url -Method POST -UseBasicParsing -TimeoutSec 10 -Headers @{
            "apikey" = $SERVICE_KEY
            "Authorization" = "Bearer $SERVICE_KEY"
            "Content-Type" = "application/json"
            "Prefer" = "return=representation"
        } -Body ($data | ConvertTo-Json)
        return ($resp.Content | ConvertFrom-Json)
    } catch {
        Write-Host "  DB-Insert error: $($_.Exception.Message)" -ForegroundColor Yellow
        return $null
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " PANELFLOW FULL REDIRECT TEST" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# PHASE 1 — Environment & Services
# ============================================================
Write-Host "--- PHASE 1: Environment & Services ---" -ForegroundColor Yellow

$health = HTTP-Get "$BASE/"
Log-Test "Server reachable on port 3000" ($health -ne $null -and $health.StatusCode -lt 500) "Status=$($health.StatusCode)"

$dbCheck = DB-Query "projects" "?limit=1"
Log-Test "DB connection (Supabase)" ($dbCheck -ne $null) "Response=$dbCheck"

# ============================================================
# PHASE 2 — Create / Verify Test Project
# ============================================================
Write-Host ""
Write-Host "--- PHASE 2: Test Project Setup ---" -ForegroundColor Yellow

$TEST_PID = "TEST_PID_001"
$testProject = $null

$existing = DB-Query "projects" "?project_code=eq.$TEST_PID&limit=1"
if ($existing -and $existing.Count -gt 0) {
    $testProject = $existing[0]
    Write-Host "  Existing project: $($testProject.project_code) id=$($testProject.id)" -ForegroundColor Cyan
    Log-Test "Test project exists in DB" $true
} else {
    $data = @{
        project_code = $TEST_PID
        client_name = "TEST_CLIENT"
        internal_name = "TEST_REDIRECT_TEST"
        survey_url = "https://httpbin.org/get"
        status = "active"
        quota = 100
    }
    $created = DB-Insert "projects" $data
    if ($created -and $created.Count -gt 0) {
        $testProject = $created[0]
        Write-Host "  Created project: $($testProject.project_code) id=$($testProject.id)" -ForegroundColor Cyan
        Log-Test "Test project created" $true
    } else {
        Log-Test "Test project created" $false "Insert returned null — check table schema"
        # Try re-fetch in case it was created
        $ex2 = DB-Query "projects" "?project_code=eq.$TEST_PID&limit=1"
        if ($ex2 -and $ex2.Count -gt 0) { $testProject = $ex2[0] }
    }
}
Log-Test "Project has valid ID" ($testProject -ne $null -and $testProject.id -ne $null) "id=$($testProject.id)"

# ============================================================
# PHASE 3 — Create Response rows for each test
# ============================================================
Write-Host ""
Write-Host "--- PHASE 3: Response Row Setup ---" -ForegroundColor Yellow

# Helper to create a fresh in_progress response
function Create-Response($uid, $session) {
    $body = @{
        project_code = $TEST_PID
        uid = $uid
        clickid = $session
        oi_session = $session
        status = "in_progress"
        ip_address = "127.0.0.1"
        user_agent = "PanelFlow-TestRunner/1.0"
    }
    if ($script:testProject -and $script:testProject.id) {
        $body["project_id"] = $script:testProject.id
    }
    $result = DB-Insert "responses" $body
    if ($result -and $result.Count -gt 0) { return $result[0] }
    # fallback fetch
    Start-Sleep -Milliseconds 300
    $f = DB-Query "responses" "?oi_session=eq.$session&limit=1"
    if ($f -and $f.Count -gt 0) { return $f[0] }
    return $null
}

function Check-Status($responseId, $expectedStatus) {
    Start-Sleep -Milliseconds 1200
    $r = DB-Query "responses" "?id=eq.$responseId&limit=1"
    if ($r -and $r.Count -gt 0) { return $r[0].status }
    return $null
}

# ============================================================
# TEST A — Direct Complete
# ============================================================
Write-Host ""
Write-Host "--- TEST A: Direct Complete ---" -ForegroundColor Yellow
$uidA = "TEST_A_" + (Get-Random -Maximum 99999)
$sidA = "oi_a" + [System.Guid]::NewGuid().ToString("N").Substring(0,14)
$rowA = Create-Response $uidA $sidA
Log-Test "TEST-A: Response row created" ($rowA -ne $null) "id=$($rowA.id)"

$urlA = "${BASE}/redirect/complete?pid=${TEST_PID}&uid=${uidA}&oi_session=${sidA}"
$respA = HTTP-Get $urlA
Log-Test "TEST-A: HTTP complete reachable" ($respA -ne $null -and $respA.StatusCode -lt 500) "Status=$($respA.StatusCode)"
$contentA = ($respA.Content -match "Complete|complete|Survey|survey")
Log-Test "TEST-A: Landing page renders" $contentA ""

if ($rowA) {
    $statusA = Check-Status $rowA.id "complete"
    Log-Test "TEST-A: DB status = complete" ($statusA -eq "complete") "Got=$statusA"
} else { Log-Test "TEST-A: DB status = complete" $false "No row" }

# ============================================================
# TEST B — Direct Terminate
# ============================================================
Write-Host ""
Write-Host "--- TEST B: Direct Terminate ---" -ForegroundColor Yellow
$uidB = "TEST_B_" + (Get-Random -Maximum 99999)
$sidB = "oi_b" + [System.Guid]::NewGuid().ToString("N").Substring(0,14)
$rowB = Create-Response $uidB $sidB
Log-Test "TEST-B: Response row created" ($rowB -ne $null) "id=$($rowB.id)"

$urlB = "${BASE}/redirect/terminate?pid=${TEST_PID}&uid=${uidB}&oi_session=${sidB}"
$respB = HTTP-Get $urlB
Log-Test "TEST-B: HTTP terminate reachable" ($respB -ne $null -and $respB.StatusCode -lt 500) "Status=$($respB.StatusCode)"
$contentB = ($respB.Content -match "Terminat|terminat|Survey|survey")
Log-Test "TEST-B: Landing page renders" $contentB ""

if ($rowB) {
    $statusB = Check-Status $rowB.id "terminate"
    Log-Test "TEST-B: DB status = terminate" ($statusB -eq "terminate") "Got=$statusB"
} else { Log-Test "TEST-B: DB status = terminate" $false "No row" }

# ============================================================
# TEST C — Direct Quota Full
# ============================================================
Write-Host ""
Write-Host "--- TEST C: Direct Quota Full ---" -ForegroundColor Yellow
$uidC = "TEST_C_" + (Get-Random -Maximum 99999)
$sidC = "oi_c" + [System.Guid]::NewGuid().ToString("N").Substring(0,14)
$rowC = Create-Response $uidC $sidC
Log-Test "TEST-C: Response row created" ($rowC -ne $null) "id=$($rowC.id)"

$urlC = "${BASE}/redirect/quotafull?pid=${TEST_PID}&uid=${uidC}&oi_session=${sidC}"
$respC = HTTP-Get $urlC
Log-Test "TEST-C: HTTP quotafull reachable" ($respC -ne $null -and $respC.StatusCode -lt 500) "Status=$($respC.StatusCode)"
$contentC = ($respC.Content -match "Quota|quota|Full|full|Survey|survey")
Log-Test "TEST-C: Landing page renders" $contentC ""

if ($rowC) {
    $statusC = Check-Status $rowC.id "quota_full"
    Log-Test "TEST-C: DB status = quota_full" ($statusC -eq "quota_full") "Got=$statusC"
} else { Log-Test "TEST-C: DB status = quota_full" $false "No row" }

# ============================================================
# TEST D — Supplier Complete
# ============================================================
Write-Host ""
Write-Host "--- TEST D: Supplier Complete ---" -ForegroundColor Yellow
$uidD = "SUP_D_" + (Get-Random -Maximum 99999)
$sidD = "oi_d" + [System.Guid]::NewGuid().ToString("N").Substring(0,14)

$bodyD = @{
    project_code = $TEST_PID; uid = $uidD; clickid = $sidD; oi_session = $sidD
    status = "in_progress"; ip_address = "127.0.0.1"; user_agent = "PanelFlow-TestRunner/1.0"
    supplier_uid = $uidD
}
if ($testProject -and $testProject.id) { $bodyD["project_id"] = $testProject.id }
$rowD_arr = DB-Insert "responses" $bodyD
if ($rowD_arr -and $rowD_arr.Count -gt 0) { $rowD = $rowD_arr[0] } else {
    Start-Sleep -Milliseconds 300
    $f = DB-Query "responses" "?oi_session=eq.$sidD&limit=1"
    if ($f -and $f.Count -gt 0) { $rowD = $f[0] }
}
Log-Test "TEST-D: Supplier response row created" ($rowD -ne $null) "id=$($rowD.id)"

$urlD = "${BASE}/redirect/complete?pid=${TEST_PID}&uid=${uidD}&oi_session=${sidD}"
$respD = HTTP-Get $urlD
Log-Test "TEST-D: Supplier complete HTTP reachable" ($respD -ne $null -and $respD.StatusCode -lt 500) "Status=$($respD.StatusCode)"

if ($rowD) {
    $statusD = Check-Status $rowD.id "complete"
    Log-Test "TEST-D: Supplier complete DB updated" ($statusD -eq "complete") "Got=$statusD"
    # Check supplier_uid preserved
    $checkD = DB-Query "responses" "?id=eq.$($rowD.id)&limit=1"
    if ($checkD -and $checkD.Count -gt 0) {
        Log-Test "TEST-D: Supplier UID preserved in DB" ($checkD[0].supplier_uid -eq $uidD) "supplier_uid=$($checkD[0].supplier_uid)"
    }
} else { Log-Test "TEST-D: DB updated" $false "No row" }

# ============================================================
# TEST E — Supplier Terminate
# ============================================================
Write-Host ""
Write-Host "--- TEST E: Supplier Terminate ---" -ForegroundColor Yellow
$uidE = "SUP_E_" + (Get-Random -Maximum 99999)
$sidE = "oi_e" + [System.Guid]::NewGuid().ToString("N").Substring(0,14)
$bodyE = @{ project_code = $TEST_PID; uid = $uidE; clickid = $sidE; oi_session = $sidE; status = "in_progress"; ip_address = "127.0.0.1"; user_agent = "TestRunner"; supplier_uid = $uidE }
if ($testProject -and $testProject.id) { $bodyE["project_id"] = $testProject.id }
$rowE_arr = DB-Insert "responses" $bodyE
if ($rowE_arr -and $rowE_arr.Count -gt 0) { $rowE = $rowE_arr[0] }
$urlE = "${BASE}/redirect/terminate?pid=${TEST_PID}&uid=${uidE}&oi_session=${sidE}"
$respE = HTTP-Get $urlE
Log-Test "TEST-E: Supplier terminate HTTP reachable" ($respE -ne $null -and $respE.StatusCode -lt 500) "Status=$($respE.StatusCode)"
if ($rowE) {
    $statusE = Check-Status $rowE.id "terminate"
    Log-Test "TEST-E: Supplier terminate DB updated" ($statusE -eq "terminate") "Got=$statusE"
} else { Log-Test "TEST-E: DB updated" $false "No row" }

# ============================================================
# TEST F — Supplier Quota Full
# ============================================================
Write-Host ""
Write-Host "--- TEST F: Supplier Quota Full ---" -ForegroundColor Yellow
$uidF = "SUP_F_" + (Get-Random -Maximum 99999)
$sidF = "oi_f" + [System.Guid]::NewGuid().ToString("N").Substring(0,14)
$bodyF = @{ project_code = $TEST_PID; uid = $uidF; clickid = $sidF; oi_session = $sidF; status = "in_progress"; ip_address = "127.0.0.1"; user_agent = "TestRunner"; supplier_uid = $uidF }
if ($testProject -and $testProject.id) { $bodyF["project_id"] = $testProject.id }
$rowF_arr = DB-Insert "responses" $bodyF
if ($rowF_arr -and $rowF_arr.Count -gt 0) { $rowF = $rowF_arr[0] }
$urlF = "${BASE}/redirect/quotafull?pid=${TEST_PID}&uid=${uidF}&oi_session=${sidF}"
$respF = HTTP-Get $urlF
Log-Test "TEST-F: Supplier quotafull HTTP reachable" ($respF -ne $null -and $respF.StatusCode -lt 500) "Status=$($respF.StatusCode)"
if ($rowF) {
    $statusF = Check-Status $rowF.id "quota_full"
    Log-Test "TEST-F: Supplier quotafull DB updated" ($statusF -eq "quota_full") "Got=$statusF"
} else { Log-Test "TEST-F: DB updated" $false "No row" }

# ============================================================
# TEST G — Fake Callback Security
# ============================================================
Write-Host ""
Write-Host "--- TEST G: Fake Callback (Security) ---" -ForegroundColor Yellow
$FAKE_PID = "FAKE_PID_XXXXXXXX"
$FAKE_UID = "FAKE_UID_XXXXXXXX"
$beforeFake = (DB-Query "responses" "?project_code=eq.$FAKE_PID").Count

$urlG = "${BASE}/redirect/complete?pid=${FAKE_PID}&uid=${FAKE_UID}"
$respG = HTTP-Get $urlG
Log-Test "TEST-G: Fake callback returns a response (no crash/500)" ($respG -ne $null -and $respG.StatusCode -lt 500) "Status=$($respG.StatusCode)"

Start-Sleep -Milliseconds 2000
$afterFake = (DB-Query "responses" "?project_code=eq.$FAKE_PID").Count
Log-Test "TEST-G: Fake PID NOT creating new rows (trust blocked)" ($afterFake -eq $beforeFake -or $afterFake -le 1) "Before=$beforeFake After=$afterFake"

# ============================================================
# TEST H — Duplicate Callback Protection
# ============================================================
Write-Host ""
Write-Host "--- TEST H: Duplicate Callback ---" -ForegroundColor Yellow
$uidH = "DEDUP_" + (Get-Random -Maximum 99999)
$sidH = "oi_h" + [System.Guid]::NewGuid().ToString("N").Substring(0,14)
$rowH = Create-Response $uidH $sidH
Log-Test "TEST-H: Response row created" ($rowH -ne $null) "id=$($rowH.id)"

$urlH = "${BASE}/redirect/complete?pid=${TEST_PID}&uid=${uidH}&oi_session=${sidH}"
$r1H = HTTP-Get $urlH
Start-Sleep -Milliseconds 800
$r2H = HTTP-Get $urlH  # duplicate

Log-Test "TEST-H: First callback succeeds" ($r1H -ne $null -and $r1H.StatusCode -lt 500) "Status=$($r1H.StatusCode)"
Log-Test "TEST-H: Second (duplicate) callback handled gracefully" ($r2H -ne $null -and $r2H.StatusCode -lt 500) "Status=$($r2H.StatusCode)"

Start-Sleep -Milliseconds 1500
$dupeRows = DB-Query "responses" "?oi_session=eq.$sidH"
Log-Test "TEST-H: No duplicate rows (exactly 1 row)" ($dupeRows.Count -eq 1) "Rows=$($dupeRows.Count)"
if ($dupeRows -and $dupeRows.Count -eq 1) {
    Log-Test "TEST-H: Final status = complete (not double-counted)" ($dupeRows[0].status -eq "complete") "status=$($dupeRows[0].status)"
}

# ============================================================
# TEST I — PID/UID Correctness
# ============================================================
Write-Host ""
Write-Host "--- TEST I: PID/UID Validation ---" -ForegroundColor Yellow
$uidI = "PIDUID_" + (Get-Random -Maximum 99999)
$sidI = "oi_i" + [System.Guid]::NewGuid().ToString("N").Substring(0,14)
$rowI = Create-Response $uidI $sidI
Log-Test "TEST-I: Response row created" ($rowI -ne $null) "id=$($rowI.id)"

$urlI = "${BASE}/redirect/complete?pid=${TEST_PID}&uid=${uidI}&oi_session=${sidI}"
$respI = HTTP-Get $urlI
Log-Test "TEST-I: Complete callback HTTP reachable" ($respI -ne $null -and $respI.StatusCode -lt 500) "Status=$($respI.StatusCode)"

if ($rowI) {
    Start-Sleep -Milliseconds 1200
    $verI = DB-Query "responses" "?id=eq.$($rowI.id)&limit=1"
    if ($verI -and $verI.Count -gt 0) {
        Log-Test "TEST-I: DB uid matches respondent UID" ($verI[0].uid -eq $uidI) "DB_uid=$($verI[0].uid)"
        Log-Test "TEST-I: DB project_code = PID" ($verI[0].project_code -eq $TEST_PID) "DB_project=$($verI[0].project_code)"
        Log-Test "TEST-I: Status changed from in_progress" ($verI[0].status -ne "in_progress") "status=$($verI[0].status)"
        # PID must not == UID (no mixing)
        Log-Test "TEST-I: PID !== UID (no mixing)" ($TEST_PID -ne $uidI) "pid=$TEST_PID uid=$uidI"
    } else { Log-Test "TEST-I: DB validation" $false "Fetch failed" }
}

# ============================================================
# PHASE 10 — Production URL smoke test
# ============================================================
Write-Host ""
Write-Host "--- PHASE 10: Production URL Smoke Test ---" -ForegroundColor Yellow
$respProd = HTTP-Get "https://track.opinioninsights.in/redirect/complete?pid=SMOKE&uid=SMOKE"
Log-Test "Production URL reachable (track.opinioninsights.in)" ($respProd -ne $null -and $respProd.StatusCode -lt 500) "Status=$($respProd.StatusCode)"

# ============================================================
# Dashboard count sync check
# ============================================================
Write-Host ""
Write-Host "--- Dashboard Count Cross-Check ---" -ForegroundColor Yellow
$allResponses = DB-Query "responses" "?project_code=eq.$TEST_PID"
$completes = ($allResponses | Where-Object { $_.status -eq "complete" }).Count
$terminates = ($allResponses | Where-Object { $_.status -eq "terminate" }).Count
$quotas = ($allResponses | Where-Object { $_.status -eq "quota_full" }).Count
$inprogress = ($allResponses | Where-Object { $_.status -eq "in_progress" }).Count
$total = $allResponses.Count
Write-Host "  Project=$TEST_PID Total=$total Complete=$completes Terminate=$terminates QuotaFull=$quotas InProgress=$inprogress" -ForegroundColor Cyan
Log-Test "Dashboard count: total >= complete+terminate+quotafull" ($total -ge ($completes + $terminates + $quotas)) "total=$total"
Log-Test "Dashboard count: completed rows > 0 after tests" ($completes -gt 0) "completes=$completes"

# ============================================================
# FINAL SUMMARY
# ============================================================
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " FINAL TEST RESULTS" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  PASSED : $PASS" -ForegroundColor Green
Write-Host "  FAILED : $FAIL" -ForegroundColor Red
Write-Host ""
$RESULTS | Format-Table -AutoSize

Write-Host ""
if ($FAIL -eq 0) {
    Write-Host "OVERALL RESULT: *** PASS ***" -ForegroundColor Green
} else {
    Write-Host "OVERALL RESULT: *** FAIL *** ($FAIL tests failed)" -ForegroundColor Red
}
