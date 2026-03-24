Param(
  [switch]$SkipTests = $true
)

$ErrorActionPreference = 'Stop'

$envFile = Join-Path $PSScriptRoot '.env'
if (-not (Test-Path $envFile)) {
  Write-Host "Missing .env file at: $envFile" -ForegroundColor Yellow
  Write-Host "Copy .env.example to .env and fill values." -ForegroundColor Yellow
  exit 1
}

Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith('#')) { return }
  $idx = $line.IndexOf('=')
  if ($idx -lt 1) { return }
  $name = $line.Substring(0, $idx).Trim()
  $value = $line.Substring($idx + 1).Trim()
  [System.Environment]::SetEnvironmentVariable($name, $value, 'Process')
}

Write-Host "Starting payment-service on http://localhost:8087" -ForegroundColor Cyan

$mvn = "mvn"
if (Test-Path "C:\Program Files\apache-maven-3.9.14\bin\mvn.cmd") {
  $mvn = "C:\Program Files\apache-maven-3.9.14\bin\mvn.cmd"
}

if ($SkipTests) {
  & $mvn -DskipTests spring-boot:run
} else {
  & $mvn spring-boot:run
}
