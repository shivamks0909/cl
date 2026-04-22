
$token = "vcp_8JHnAB8n1DJjvLBoRVvlj8KbwBeDDMxNq4ZtwOEixyV6v1y8WH3PXEp2"
"Starting deployment at $(Get-Date)" | Out-File -FilePath deploy_monitor.log
Start-Process -FilePath "npx.cmd" -ArgumentList "vercel deploy --prod --yes --token $token" -RedirectStandardOutput "deploy_stdout.log" -RedirectStandardError "deploy_stderr.log" -Wait
"Deployment process finished at $(Get-Date)" | Out-File -FilePath deploy_monitor.log -Append
