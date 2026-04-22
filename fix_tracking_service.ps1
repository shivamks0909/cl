$path = "lib/tracking-service.ts"
$content = Get-Content $path -Raw

# Remove the .is('deleted_at', null) line
$content = $content -replace "        \.is\('deleted_at', null'\)`r`n", ""

# Now we need to insert soft-delete check after the line checking project.status
# We'll look for the pattern: if (project.status !== 'active') return { ... }
# and insert after that.
$pattern = "(      if \(project\.status \!== 'active'\) return \{ success: false, errorType: 'PROJECT_PAUSED' \}`r`n)"
$replacement = "`$1`r`n      // Soft-delete check (deleted_at should be null)`r`n      if ((project as any).deleted_at !== null && (project as any).deleted_at !== undefined) {`r`n        return { success: false, errorType: 'PROJECT_NOT_FOUND' }`r`n      }`r`n"
$content = [regex]::Replace($content, $pattern, $replacement)

Set-Content -Path $path -Value $content -NoNewline
Write-Host "File updated."
