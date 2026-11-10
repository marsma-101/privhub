# ============================================================
# PrivHub - fetch the official nginx binary into runtime/nginx
#
# ASCII-only by design: Windows PowerShell 5.1 mangles non-BOM
# UTF-8 .ps1 files into parse errors (see CLAUDE.md).
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\fetch-nginx.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\fetch-nginx.ps1 -Force
#
# The download is pinned to an official nginx.org release and its
# SHA256 is verified before extraction. runtime/nginx/ is gitignored;
# the build script ships it with the installer package.
# ============================================================

param(
    [string]$Version = "1.30.6",
    [string]$ExpectedSha256 = "c6ee35edb0a861063323f709192ae50d1eefaf2ea7d00678bd2b22d8542dc61e",
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $root "runtime"
$dest = Join-Path $runtimeDir "nginx"
$nginxExe = Join-Path $dest "nginx.exe"

if ((Test-Path $nginxExe) -and (-not $Force)) {
    Write-Host "[nginx] already present: $dest (use -Force to reinstall)"
    & $nginxExe -v
    exit 0
}

$url = "https://nginx.org/download/nginx-$Version.zip"
$tmpRoot = Join-Path $env:TEMP ("privhub-nginx-" + [Guid]::NewGuid().ToString("N"))
$zip = Join-Path $tmpRoot "nginx-$Version.zip"
$unpack = Join-Path $tmpRoot "unpack"

try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    New-Item -ItemType Directory -Path $tmpRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $unpack -Force | Out-Null

    Write-Host "[nginx] downloading $url"
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing

    $actual = (Get-FileHash -Path $zip -Algorithm SHA256).Hash.ToLowerInvariant()
    Write-Host "[nginx] sha256 $actual"
    if ($actual -ne $ExpectedSha256.ToLowerInvariant()) {
        throw "SHA256 mismatch: expected $ExpectedSha256, got $actual"
    }

    Expand-Archive -Path $zip -DestinationPath $unpack -Force
    $src = Join-Path $unpack "nginx-$Version"
    if (-not (Test-Path (Join-Path $src "nginx.exe"))) {
        throw "Archive layout unexpected: nginx.exe not found in $src"
    }

    if (Test-Path $dest) { Remove-Item -Path $dest -Recurse -Force }
    New-Item -ItemType Directory -Path $dest -Force | Out-Null
    Copy-Item -Path (Join-Path $src "*") -Destination $dest -Recurse -Force

    Write-Host "[nginx] installed to $dest"
    & $nginxExe -v
}
finally {
    if (Test-Path $tmpRoot) {
        Remove-Item -Path $tmpRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
