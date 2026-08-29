# ============================================================
# PrivHub 生产部署包构建脚本（v3：纯 Cordis，无底座源码）
# 用法：powershell -ExecutionPolicy Bypass -File scripts/build-deploy.ps1
# 产出：deploy/privhub-deploy/（约 19MB，独立运行，无任何外部引用）
# ============================================================

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$src  = Join-Path $root 'privhub'
$out  = Join-Path $root 'deploy\privhub-deploy'

Write-Host "==> 构建部署包到 $out"

if (Test-Path $out) {
  $empty = Join-Path (Split-Path $out) '_empty'
  New-Item -ItemType Directory -Force $empty | Out-Null
  robocopy $empty $out /MIR /R:1 /W:1 /NFL /NDL /NJH /NJS | Out-Null
  Remove-Item $empty -Force -ErrorAction SilentlyContinue
  Remove-Item $out -Force -ErrorAction SilentlyContinue
}

function Copy-Tree($from, $to, $excludeDirs = @()) {
  $ro = @('/E', '/MT:16', '/SL', '/NFL', '/NDL', '/NJH', '/NJS', '/R:2', '/W:1')
  foreach ($d in $excludeDirs) { $ro += @('/XD', $d) }
  robocopy $from $to @ro | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($LASTEXITCODE): $from" }
}

Write-Host '==> [1/3] 代码与前端复制（plugins / frontend / src，排除 data）...'
Copy-Tree (Join-Path $src 'plugins') (Join-Path $out 'plugins')
Copy-Tree (Join-Path $src 'frontend') (Join-Path $out 'frontend')
Copy-Tree (Join-Path $src 'src') (Join-Path $out 'src')

Write-Host '==> [2/3] 依赖（node_modules）与数据目录...'
Copy-Tree (Join-Path $src 'node_modules') (Join-Path $out 'node_modules')
New-Item -ItemType Directory -Force (Join-Path $out 'data-files') | Out-Null

Write-Host '==> [3/3] 启动器与文档...'
Copy-Item (Join-Path $src 'start.bat') (Join-Path $out 'start.bat') -Force
Copy-Item (Join-Path $src 'package.json') (Join-Path $out 'package.json') -Force
Copy-Item (Join-Path $src '部署说明.md') (Join-Path $out '部署说明.md') -Force
Copy-Item (Join-Path $src '.gitignore') (Join-Path $out '.gitignore') -Force -ErrorAction SilentlyContinue

$size = (Get-ChildItem $out -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
Write-Host ('==> 完成。部署包体积：' + [math]::Round($size / 1MB, 2) + ' MB')
Write-Host "==> 位置：$out"
