# ============================================================
# PrivHub 运行底座同步脚本：references/engine（完整源码）→ privhub/engine（运行精简副本）
# 用法：powershell -ExecutionPolicy Bypass -File scripts/sync-runtime-engine.ps1
# 底座升级时重跑本脚本即可（底座源码只读，运行副本只含必需内容）
# ============================================================

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$refEngine = Join-Path $root 'references\engine'
$runEngine = Join-Path $root 'privhub\engine'

if (-not (Test-Path "$refEngine\apps\cli\src\bin.ts")) { throw "references/engine 不存在或不是完整底座: $refEngine" }

Write-Host "==> 同步运行底座: $refEngine -> $runEngine"

# 长路径安全删除旧副本
if (Test-Path $runEngine) {
  $empty = Join-Path $root '_empty'
  New-Item -ItemType Directory -Force $empty | Out-Null
  robocopy $empty $runEngine /MIR /R:1 /W:1 /NFL /NDL /NJH /NJS | Out-Null
  Remove-Item $empty -Force -ErrorAction SilentlyContinue
  Remove-Item $runEngine -Force -ErrorAction SilentlyContinue
}

function Copy-Tree($from, $to, $excludeDirs = @(), $excludeFiles = @()) {
  $ro = @('/E', '/MT:16', '/SL', '/NFL', '/NDL', '/NJH', '/NJS', '/R:2', '/W:1')
  foreach ($d in $excludeDirs) { $ro += @('/XD', $d) }
  foreach ($f in $excludeFiles) { $ro += @('/XF', $f) }
  robocopy $from $to @ro | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($LASTEXITCODE): $from" }
}

# .pnpm dev 依赖排除清单（无运行时引用：构建/文档/可选后端）
$devStoreExcludes = @(
  (Join-Path $refEngine 'node_modules\.pnpm\@openai+codex@*'),
  (Join-Path $refEngine 'node_modules\.pnpm\@anthropic-ai+claude-agent-sdk*'),
  (Join-Path $refEngine 'node_modules\.pnpm\mermaid@*'),
  (Join-Path $refEngine 'node_modules\.pnpm\@mermaid-js+*'),
  (Join-Path $refEngine 'node_modules\.pnpm\@rolldown+binding*'),
  (Join-Path $refEngine 'node_modules\.pnpm\rolldown@*'),
  (Join-Path $refEngine 'node_modules\.pnpm\tsdown@*'),
  (Join-Path $refEngine 'node_modules\.pnpm\typescript@*'),
  (Join-Path $refEngine 'node_modules\.pnpm\@oxlint*'),
  (Join-Path $refEngine 'node_modules\.pnpm\oxlint@*'),
  (Join-Path $refEngine 'node_modules\.pnpm\lefthook*'),
  (Join-Path $refEngine 'node_modules\.pnpm\lightningcss*'),
  (Join-Path $refEngine 'node_modules\.pnpm\playwright*'),
  (Join-Path $refEngine 'node_modules\.pnpm\@google+genai*'),
  (Join-Path $refEngine 'node_modules\.pnpm\@mistralai+*'),
  (Join-Path $refEngine 'node_modules\.pnpm\@shikijs*'),
  (Join-Path $refEngine 'node_modules\.pnpm\vitest@*'),
  (Join-Path $refEngine 'node_modules\.pnpm\@vitest*'),
  (Join-Path $refEngine 'node_modules\.pnpm\vite@*'),
  (Join-Path $refEngine 'node_modules\.pnpm\jsdom@*'),
  (Join-Path $refEngine 'node_modules\.pnpm\@testing-library*'),
  (Join-Path $refEngine 'node_modules\.pnpm\@stylistic*'),
  (Join-Path $refEngine 'node_modules\.pnpm\@yarnpkg*'),
  (Join-Path $refEngine 'node_modules\.pnpm\fast-check*'),
  (Join-Path $refEngine 'node_modules\.pnpm\istanbul*'),
  (Join-Path $refEngine 'node_modules\.pnpm\mdast*'),
  (Join-Path $refEngine 'node_modules\.pnpm\micromark*'),
  (Join-Path $refEngine 'node_modules\.pnpm\smol-toml*'),
  (Join-Path $refEngine 'node_modules\.pnpm\spdx-expression-parse*'),
  (Join-Path $refEngine 'node_modules\.pnpm\knip@*'),
  (Join-Path $refEngine 'node_modules\.pnpm\publint@*'),
  (Join-Path $refEngine 'node_modules\.pnpm\jscpd@*'),
  (Join-Path $refEngine 'node_modules\.pnpm\eslint@*'),
  (Join-Path $refEngine 'node_modules\.pnpm\@eslint*'),
  (Join-Path $refEngine 'node_modules\.pnpm\@typescript-eslint*'),
  (Join-Path $refEngine 'node_modules\.pnpm\prettier@*'),
  (Join-Path $refEngine 'node_modules\.pnpm\@prettier*')
)

Write-Host '==> [1/2] 复制运行必需内容（排除开发目录）...'
Copy-Tree $refEngine $runEngine `
  -excludeDirs @('.git', '.agents', '.claude', '.github', 'docs', 'examples', 'website', 'python', 'scripts', 'assets', '.dsh-build') `
  -excludeFiles @('*.tsbuildinfo')

Write-Host '==> [2/2] 删除 .pnpm dev 依赖目录（前缀以 @ 开头，robocopy /XD 无法使用）...'
$pnpmOut = Join-Path $runEngine 'node_modules\.pnpm'
$removed = 0
foreach ($prefix in $devStoreExcludes) {
  $name = Split-Path $prefix -Leaf
  Get-ChildItem $pnpmOut -Directory -Filter $name -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    if (-not (Test-Path $_.FullName)) { $removed++ }
  }
}
Write-Host ("  removed dev store dirs: " + $removed)

$size = (Get-ChildItem $runEngine -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
Write-Host ('==> 完成。运行底座体积：' + [math]::Round($size / 1MB, 1) + ' MB')
