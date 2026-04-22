
$token = Get-Content .vercel-token -Raw
$token = $token.Trim()
Write-Output "Deploying to Vercel with token..."
npx vercel deploy --prod --yes --token $token > deploy_result.log 2>&1
Write-Output "Deployment finished. Check deploy_result.log"
