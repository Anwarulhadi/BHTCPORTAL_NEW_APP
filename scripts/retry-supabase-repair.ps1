param(
  [string]$MigrationId = '20251204000000',
  [string]$ProjectRef = '',
  [int]$MaxRetries = 20,
  [int]$InitialDelaySeconds = 5
)

function Ensure-SupabaseCli {
  $cmd = Get-Command supabase -ErrorAction SilentlyContinue
  if (-not $cmd) {
    Write-Error "Cannot find 'supabase' CLI. Install it first: https://supabase.com/docs/guides/cli"
    exit 2
  }
}

Ensure-SupabaseCli

if (-not $MigrationId) {
  Write-Error 'MigrationId is required. Example: ./retry-supabase-repair.ps1 -MigrationId 20251204000000'
  exit 2
}

$attempt = 0
$delay = [int]$InitialDelaySeconds
$lastExit = 1

Write-Host "Starting retry loop for migration repair: $MigrationId"
if ($ProjectRef) { Write-Host "Using project ref: $ProjectRef" }

while ($attempt -lt $MaxRetries) {
  $attempt++
  Write-Host "Attempt $attempt of $MaxRetries..."

  $args = @('migration','repair','--status','applied',$MigrationId)
  if ($ProjectRef) { $args += @('--project-ref',$ProjectRef) }

  & supabase @args
  $lastExit = $LASTEXITCODE

  if ($lastExit -eq 0) {
    Write-Host "Migration repair succeeded on attempt $attempt." -ForegroundColor Green
    exit 0
  }

  Write-Warning "Attempt $attempt failed (exit code $lastExit). Retrying in $delay seconds..."
  Start-Sleep -Seconds $delay
  # exponential backoff with cap
  $delay = [math]::Min($delay * 2, 300)
}

Write-Error "All $MaxRetries attempts failed. Last exit code: $lastExit"
exit $lastExit
