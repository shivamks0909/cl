$r = Invoke-WebRequest -Uri 'http://localhost:3000/start/TEST_SRC_978510' -MaximumRedirection 5 -WebSession $s
Write-Host "Status:" $r.StatusCode
Write-Host "Location:" $r.Headers["Location"]
Write-Host "Final URL:" $r.BaseResponse.ResponseUrl
