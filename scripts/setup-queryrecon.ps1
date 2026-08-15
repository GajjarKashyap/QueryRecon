$ErrorActionPreference = 'Stop'

$projectDir = Split-Path -Parent $PSScriptRoot
$localDir = Join-Path $projectDir '.queryrecon-local'
$bootstrapPath = Join-Path $localDir 'bootstrap.json'
$hermesCandidates = @(
  (Get-Command hermes.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1),
  (Join-Path $env:LOCALAPPDATA 'hermes\hermes-agent\bin\hermes.exe'),
  (Join-Path $env:LOCALAPPDATA 'hermes\hermes-agent\venv\Scripts\hermes.exe')
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }
$hermesExe = $hermesCandidates | Select-Object -First 1

if (-not $hermesExe) { throw 'Hermes Agent was not found. Install Hermes, then run setup-queryrecon.bat again.' }
if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) { throw 'Node.js was not found.' }
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'npm was not found.' }

function Read-Secret([string]$label, [bool]$required) {
  while ($true) {
    $secure = Read-Host $label -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { $value = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    if ($value -or -not $required) { return $value }
    Write-Host 'A value is required.' -ForegroundColor Yellow
  }
}

function New-Token {
  $bytes = New-Object byte[] 32
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
  return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function Set-EnvValue([string]$path, [string]$name, [string]$value) {
  $lines = if (Test-Path -LiteralPath $path) { [Collections.Generic.List[string]](Get-Content -LiteralPath $path) } else { [Collections.Generic.List[string]]::new() }
  $replacement = "$name=$value"
  $found = $false
  for ($index = 0; $index -lt $lines.Count; $index++) {
    if ($lines[$index] -match "^\s*$([Regex]::Escape($name))\s*=") { $lines[$index] = $replacement; $found = $true; break }
  }
  if (-not $found) { $lines.Add($replacement) }
  [IO.File]::WriteAllLines($path, $lines, [Text.UTF8Encoding]::new($false))
}

function Test-Port([string]$hostName, [int]$port) {
  $client = [Net.Sockets.TcpClient]::new()
  try { $client.Connect($hostName, $port); return $true } catch { return $false } finally { $client.Dispose() }
}

Clear-Host
Write-Host 'QueryRecon + Hermes Agent setup' -ForegroundColor Cyan
Write-Host 'Secrets are masked, saved locally, and excluded from Git.'
Write-Host ''

$geminiKey = Read-Secret 'Google Gemini API key' $true
$geminiModel = Read-Host 'Gemini model [gemini-3.1-flash-lite]'
if (-not $geminiModel) { $geminiModel = 'gemini-3.1-flash-lite' }
$deepSeekKey = Read-Secret 'DeepSeek API key (optional; press Enter to skip)' $false
$deepSeekModel = if ($deepSeekKey) { Read-Host 'DeepSeek model [deepseek-chat]' } else { '' }
if ($deepSeekKey -and -not $deepSeekModel) { $deepSeekModel = 'deepseek-chat' }
$gatewayKey = New-Token
$setupToken = New-Token

New-Item -ItemType Directory -Path $localDir -Force | Out-Null
$envPath = (& $hermesExe config env-path | Out-String).Trim()
if (-not $envPath) { $envPath = Join-Path $env:LOCALAPPDATA 'hermes\.env' }
New-Item -ItemType Directory -Path (Split-Path -Parent $envPath) -Force | Out-Null
Set-EnvValue $envPath 'GOOGLE_API_KEY' $geminiKey
if ($deepSeekKey) { Set-EnvValue $envPath 'DEEPSEEK_API_KEY' $deepSeekKey }

$settings = @{
  'model.default' = $geminiModel
  'model.provider' = 'gemini'
  'model.base_url' = 'https://generativelanguage.googleapis.com/v1beta'
  'terminal.cwd' = $projectDir
  'gateway.api_server.enabled' = 'true'
  'gateway.api_server.host' = '127.0.0.1'
  'gateway.api_server.port' = '8642'
  'gateway.api_server.key' = $gatewayKey
  'gateway.api_server.cors_origins' = 'http://localhost:5173'
  'gateway.api_server.model_name' = 'hermes-agent'
}
foreach ($entry in $settings.GetEnumerator()) { & $hermesExe config set $entry.Key $entry.Value | Out-Null }

$bootstrap = @{
  token = $setupToken
  keys = @{ gemini = $geminiKey; deepseek = $deepSeekKey }
  models = @{ gemini = $geminiModel; deepseek = $deepSeekModel }
  hermes = @{ endpoint = 'http://127.0.0.1:8642'; apiKey = $gatewayKey; provider = 'gemini'; model = $geminiModel }
}
[IO.File]::WriteAllText($bootstrapPath, ($bootstrap | ConvertTo-Json -Depth 4 -Compress), [Text.UTF8Encoding]::new($false))

& $hermesExe gateway stop 2>$null | Out-Null
Start-Process -FilePath $hermesExe -ArgumentList @('gateway', 'run') -WorkingDirectory $projectDir -WindowStyle Hidden | Out-Null
for ($attempt = 0; $attempt -lt 30 -and -not (Test-Port '127.0.0.1' 8642); $attempt++) { Start-Sleep -Milliseconds 500 }
if (-not (Test-Port '127.0.0.1' 8642)) { throw 'Hermes did not open port 8642.' }

if (-not (Test-Port 'localhost' 5173)) {
  Start-Process -FilePath 'npm.cmd' -ArgumentList @('run', 'dev') -WorkingDirectory $projectDir -WindowStyle Hidden | Out-Null
  for ($attempt = 0; $attempt -lt 30 -and -not (Test-Port 'localhost' 5173); $attempt++) { Start-Sleep -Milliseconds 500 }
}
if (-not (Test-Port 'localhost' 5173)) { throw 'QueryRecon did not open port 5173.' }

Start-Process "http://localhost:5173/?setupToken=$setupToken"
Write-Host ''
Write-Host 'Setup complete. QueryRecon is opening with Hermes connected.' -ForegroundColor Green
Write-Host 'You can close this window.'
