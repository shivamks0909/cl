$path = "lib/tracking-service.ts"
$lines = Get-Content $path

$newLines = @()
$inserted = $false

for ($i=0; $i -lt $lines.Length; $i++) {
    $line = $lines[$i]
    # Skip the line containing .is('deleted_at', null)
    if ($line -match "        \.is\('deleted_at', null'\)") {
        continue
    }
    # After the line with project.status check, insert soft-delete check
    if (-not $inserted -and $line -match "      if \(project\.status \!== 'active'\) return \{ success: false, errorType: 'PROJECT_PAUSED' \}") {
        $newLines += $line
        # Insert after this line
        $newLines += "      // Soft-delete check (deleted_at should be null)"
        $newLines += "      if ((project as any).deleted_at !== null && (project as any).deleted_at !== undefined) {"
        $newLines += "        return { success: false, errorType: 'PROJECT_NOT_FOUND' }"
        $newLines += "      }"
        $inserted = $true
    } else {
        $newLines += $line
    }
}

Set-Content -Path $path -Value $newLines -NoNewline
Write-Host "Applied fixes. Soft-delete inserted: $inserted"
