$body = @{
    name = "Test Redirect Flow"
    baseUrl = "http://example.com/survey"
    clientCompleteUrl = "https://track.opinioninsights.in/redirect/complete?pid={pid}&uid={uid}"
    clientTerminateUrl = "https://track.opinioninsights.in/redirect/terminate?pid={pid}&uid={uid}"
    clientQuotaUrl = "https://track.opinioninsights.in/redirect/quotafull?pid={pid}&uid={uid}"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/admin/projects" -Method Post -ContentType "application/json" -Body $body
Write-Host $response
