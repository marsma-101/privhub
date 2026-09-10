<#
.SYNOPSIS
  PrivHub production deploy builder (O1/O4).  ASCII-only on purpose.

.DESCRIPTION
  Syncs privhub/{src,plugins,frontend} into deploy/privhub-deploy/ to produce
  a standalone, runnable deployment package.

  NOTE ON ENCODING: this script is intentionally ASCII-only.
  Windows PowerShell 5.1 reads .ps1 files as ANSI unless they carry a UTF-8 BOM;
  a UTF-8 file without BOM containing Chinese text gets mangled into parse errors
  (this exact failure was hit twice while writing this script, and is the same
  class of accident recorded in the project's own incident notes).
  Keeping the script ASCII-only removes the dependency on BOM handling entirely.

  SAFETY: by default this script NEVER touches the target data/ or data-files/.
  Overwriting them would break decryption of existing data (the key file lives
  in data/secret.key).  Use -IncludeData only for a brand-new deployment.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/build-deploy.ps1
  powershell -ExecutionPolicy Bypass -File scripts/build-deploy.ps1 -WhatIfOnly
  powershell -ExecutionPolicy Bypass -File scripts/build-deploy.ps1 -OutDir D:\privhub-prod
#>
[CmdletBinding()]
param(
  [string]$SrcDir = '',
  [string]$OutDir = '',
  [switch]$IncludeData,
  [switch]$WhatIfOnly
)

$ErrorActionPreference = 'Stop'

function Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Warn($msg) { Write-Host "!!! $msg" -ForegroundColor Yellow }

# Resolve defaults here (not in param block): PS 5.1 may leave $PSScriptRoot
# empty while binding default parameter values.
$repoRoot = Split-Path -Parent $PSScriptRoot
if ($SrcDir -eq '') { $SrcDir = Join-Path $repoRoot 'privhub' }
if ($OutDir -eq '') { $OutDir = Join-Path $repoRoot 'deploy\privhub-deploy' }

if (-not (Test-Path $SrcDir)) { throw "Source dir not found: $SrcDir" }
$SrcDir = (Resolve-Path $SrcDir).Path

Step "Source     : $SrcDir"
Step "Destination: $OutDir"

# Only code is synced here; data and node_modules are handled separately.
$syncDirs = @('src', 'plugins', 'frontend')
$syncFiles = @('package.json', 'start.bat')

if (-not $WhatIfOnly) {
  New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
}

# ---- data protection ----
$dataDir = Join-Path $OutDir 'data'
$keyFile = Join-Path $dataDir 'secret.key'
if (-not $IncludeData) {
  if (Test-Path $keyFile) {
    Step "Existing data/secret.key detected - existing data will be PRESERVED"
  }
} else {
  Warn "IncludeData specified: data/ and data-files/ will be synced."
  Warn "If the target already holds data under a different key, that data becomes unreadable."
  if (Test-Path $keyFile) {
    $ans = Read-Host "Type YES to overwrite existing data"
    if ($ans -ne 'YES') { throw 'Cancelled by user' }
  }
}

# ---- sync code directories ----
foreach ($d in $syncDirs) {
  $src = Join-Path $SrcDir $d
  if (-not (Test-Path $src)) { Warn "skip (missing): $d"; continue }
  $dst = Join-Path $OutDir $d
  Step "Sync dir $d"
  if (-not $WhatIfOnly) {
    # /MIR mirrors the tree; /XD excludes runtime artefacts.
    $rc = Start-Process -FilePath 'robocopy' -ArgumentList @(
      "`"$src`"", "`"$dst`"", '/MIR', '/NFL', '/NDL', '/NJH', '/NJS', '/NP',
      '/XD', 'node_modules', '.git', '__pycache__'
    ) -Wait -PassThru -NoNewWindow
    # robocopy exit codes 0-7 mean success.
    if ($rc.ExitCode -ge 8) { throw "robocopy failed for $d (exit $($rc.ExitCode))" }
  }
}

foreach ($f in $syncFiles) {
  $src = Join-Path $SrcDir $f
  if (-not (Test-Path $src)) { continue }
  Step "Copy file $f"
  if (-not $WhatIfOnly) { Copy-Item -LiteralPath $src -Destination (Join-Path $OutDir $f) -Force }
}

if ($IncludeData -and -not $WhatIfOnly) {
  foreach ($d in @('data', 'data-files')) {
    $src = Join-Path $SrcDir $d
    if (-not (Test-Path $src)) { continue }
    # /E (not /MIR): never delete target-only files, to avoid wiping runtime additions.
    Step "Sync data $d (no deletions)"
    $rc = Start-Process -FilePath 'robocopy' -ArgumentList @(
      "`"$src`"", "`"$(Join-Path $OutDir $d)`"", '/E', '/NFL', '/NDL', '/NJH', '/NJS', '/NP'
    ) -Wait -PassThru -NoNewWindow
    if ($rc.ExitCode -ge 8) { throw "robocopy failed for data $d (exit $($rc.ExitCode))" }
  }
}

# ---- verification ----
Step 'Verify package'
$pluginDir = Join-Path $OutDir 'plugins'
$pluginCount = 0
if (Test-Path $pluginDir) {
  $pluginCount = (Get-ChildItem $pluginDir -Directory |
    Where-Object { $_.Name -notlike '_*' }).Count
}
$hasRag = Test-Path (Join-Path $OutDir 'plugins\privhub-svc-rag\src\index.ts')
$coreFile = Join-Path $OutDir 'plugins\privhub-core\src\index.ts'
$hasHealth = $false
if (Test-Path $coreFile) {
  $hasHealth = ((Select-String -Path $coreFile -Pattern '/privhub/api/health' -ErrorAction SilentlyContinue) -ne $null)
}
$dataState = 'absent (auto-created on first start)'
if (Test-Path $dataDir) { $dataState = 'preserved (not overwritten)' }

Write-Host ""
Write-Host "  plugin dirs : $pluginCount"
Write-Host "  has svc-rag : $hasRag"
Write-Host "  has health  : $hasHealth"
Write-Host "  data dir    : $dataState"
Write-Host ""

if ($pluginCount -lt 48) { Warn "Plugin count is below 48 - check the sync result" }
if (-not $hasRag) { Warn "svc-rag plugin missing" }

Step 'Done. To start:'
Write-Host "  cd `"$OutDir`""
Write-Host "  npm install        # first time only (restores node_modules)"
Write-Host "  start.bat 3181     # production port"
Write-Host ""
