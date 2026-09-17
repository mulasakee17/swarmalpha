# Watchdog runner for the GLM-FLASH (free tier) cross-model fork full run.
# Restarts run_v6_fork_glm_flash.ts on non-zero exit (up to $maxRetries
# attempts, 90s cooldown between attempts). Safe to restart: runForkExecute
# resumes from already-written per-task .jsonl files.
$ErrorActionPreference = "Continue"
# Build the workspace root from the user profile to avoid any non-ASCII
# literal in this file (Windows PowerShell 5.1 decodes UTF-8 no-BOM as ANSI).
$root = Join-Path $env:USERPROFILE "Desktop\swarmalpha"
Set-Location $root
$env:RUN_AUTHORIZED = "yes"
$maxRetries = 6

for ($i = 1; $i -le $maxRetries; $i++) {
  Write-Output "=== flash attempt $i started at $(Get-Date -Format o) ==="
  npx tsx experiments/campaign/v6/run_v6_fork_glm_flash.ts --execute 2>&1
  $code = $LASTEXITCODE
  Write-Output "=== flash attempt $i exited $code at $(Get-Date -Format o) ==="
  if ($code -eq 0) { Write-Output "=== flash full run completed OK ==="; exit 0 }
  if ($i -lt $maxRetries) { Start-Sleep -Seconds 90 }
}
Write-Output "=== flash watchdog gave up after $maxRetries attempts ==="
exit 1
