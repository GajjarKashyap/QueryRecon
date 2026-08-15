$ErrorActionPreference = 'Stop'

$projectDir = Split-Path -Parent $PSScriptRoot
$hermesExe = @(
  (Get-Command hermes.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1),
  (Join-Path $env:LOCALAPPDATA 'hermes\hermes-agent\bin\hermes.exe'),
  (Join-Path $env:LOCALAPPDATA 'hermes\hermes-agent\venv\Scripts\hermes.exe')
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
$gitBash = Join-Path $env:ProgramFiles 'Git\bin\bash.exe'

if (-not $hermesExe) { throw 'Hermes Agent was not found.' }
if (-not (Test-Path -LiteralPath $gitBash)) { throw 'Git Bash was not found. Install Git for Windows first.' }

function Set-EnvValue([string]$path, [string]$name, [string]$value) {
  $lines = [Collections.Generic.List[string]]::new()
  if (Test-Path -LiteralPath $path) { Get-Content -LiteralPath $path | ForEach-Object { $lines.Add($_) } }
  $replacement = "$name=$value"
  $found = $false
  for ($index = 0; $index -lt $lines.Count; $index++) {
    if ($lines[$index] -match "^\s*$([Regex]::Escape($name))\s*=") { $lines[$index] = $replacement; $found = $true; break }
  }
  if (-not $found) { $lines.Add($replacement) }
  [IO.File]::WriteAllLines($path, $lines, [Text.UTF8Encoding]::new($false))
}

$envPath = (& $hermesExe config env-path | Out-String).Trim()
if (-not $envPath) { $envPath = Join-Path $env:LOCALAPPDATA 'hermes\.env' }
Set-EnvValue $envPath 'HERMES_GIT_BASH_PATH' $gitBash
Set-EnvValue $envPath 'TERMINAL_CWD' $projectDir
& $hermesExe config set terminal.cwd $projectDir | Out-Null
& $hermesExe gateway stop 2>$null | Out-Null
$env:HERMES_GIT_BASH_PATH = $gitBash
$env:TERMINAL_CWD = $projectDir
Start-Process -FilePath $hermesExe -ArgumentList @('gateway', 'run') -WorkingDirectory $projectDir -WindowStyle Hidden | Out-Null

Write-Host "Hermes now uses $projectDir" -ForegroundColor Green
Write-Host 'The gateway was restarted with Git Bash file tools enabled.'
