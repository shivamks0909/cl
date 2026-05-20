# Full Redirect Flow Test Script
# Run this after starting the dev server

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "REDIRECT FLOW TEST" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Test Base URL
$BASE_URL = "http://localhost:3000"

# Test URLs
Write-Host "`n[TEST 1] Direct Complete Redirect (Fake)" -ForegroundColor Yellow
$response1 = Invoke-WebRequest -Uri "$BASE_URL/redirect/complete?pid=random&uid=random" -UseBasicParsing
if ($response1.StatusCode -eq 200) {
    Write-Host "✅ PASS: Landing page loads" -ForegroundColor Green
} else {
    Write-Host "❌ FAIL: Status $($response1.StatusCode)" -ForegroundColor Red
}

Write-Host "`n[TEST 2] Direct Terminate Redirect" -ForegroundColor Yellow
$response2 = Invoke-WebRequest -Uri "$BASE_URL/redirect/terminate?pid=TEST_PID_001&uid=TEST_001" -UseBasicParsing
if ($response2.StatusCode -eq 200) {
    Write-Host "✅ PASS: Landing page loads" -ForegroundColor Green
} else {
    Write-Host "❌ FAIL: Status $($response2.StatusCode)" -ForegroundColor Red
}

Write-Host "`n[TEST 3] Direct Quota Full Redirect" -ForegroundColor Yellow
$response3 = Invoke-WebRequest -Uri "$BASE_URL/redirect/quotafull?pid=TEST_PID_001&uid=TEST_002" -UseBasicParsing
if ($response3.StatusCode -eq 200) {
    Write-Host "✅ PASS: Landing page loads" -ForegroundColor Green
} else {
    Write-Host "❌ FAIL: Status $($response3.StatusCode)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "MANUAL TESTING REQUIRED:" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host @"
1. Login to: $BASE_URL/login
   - Email: admin@opinioninsights.in
   - Password: Admin@123

2. Create Project:
   - Name: TEST_CLIENT_FLOW
   - PID: TEST_PID_001
   - Base Survey URL: https://dummy-client-survey.com/start?uid=[UID]
   - Complete URL: https://track.opinioninsights.in/redirect/complete?pid=TEST_PID_001&uid=[UID]
   - Terminate URL: https://track.opinioninsights.in/redirect/terminate?pid=TEST_PID_001&uid=[UID]
   - Quota URL: https://track.opinioninsights.in/redirect/quotafull?pid=TEST_PID_001&uid=[UID]

3. Generate launch link from project

4. Test flows:
   - Complete flow: Launch link → Complete survey
   - Terminate flow: Launch link → Fail screener
   - Quota flow: Launch link → Trigger quota

5. Verify:
   - Landing page shows WavyOutcomeView
   - Response table updates
   - Dashboard counts update
   - Correct status (complete/terminate/quota_full)
"@ -ForegroundColor White

Write-Host "`n[TEST 4] Security Test - No DB Update" -ForegroundColor Yellow
Write-Host "Open: $BASE_URL/redirect/complete?pid=fake123&uid=fake456" -ForegroundColor White
Write-Host "Expected: Landing page loads but NO database update" -ForegroundColor White
