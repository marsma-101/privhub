# PrivHub 部署包瘦身：删除无运行时引用的 dev/文档/可选依赖（在部署包副本上执行）
# 用法：powershell -ExecutionPolicy Bypass -File scripts/prune-deploy.ps1 <包根>
param([Parameter(Mandatory=$true)][string]$PkgRoot)

$pnpm = Join-Path $PkgRoot 'engine\node_modules\.pnpm'
if (-not (Test-Path $pnpm)) { Write-Error ".pnpm not found: $pnpm"; exit 1 }

# 删除前缀清单（.pnpm 目录名匹配；均为无运行时引用的 dev/文档/可选依赖，经 import 链核对）
$prefixes = @(
  '@openai+codex@',                       # subagent-codex 可选后端（无 bundle 引用）
  '@anthropic-ai+claude-agent-sdk',       # subagent-claude-code 可选后端
  'mermaid@', '@mermaid-js+',             # 文档图表（website/docs 用）
  '@rolldown+binding', 'rolldown@',       # tsdown 构建
  'tsdown@',
  'typescript@',                          # tsc 构建（tsx 用 esbuild，不依赖 tsc）
  '@oxlint', 'oxlint@',                   # lint
  'lefthook',                             # git hook（postinstall 用）
  'lightningcss',                         # vite
  'playwright',                          # 测试
  '@esbuild+win32-x64@0.28.1', '@esbuild+win32-x64@0.21.5', 'esbuild@0.28.1', 'esbuild@0.21.5',  # 保留 0.25.x（tsx 用）
  'vitest@', '@vitest', 'vite@', 'jsdom@', '@testing-library', '@stylistic', '@yarnpkg',
  'fast-check', 'istanbul', 'mdast', 'micromark', 'smol-toml', 'spdx-expression-parse',
  'knip@', 'publint@', 'jscpd@', '@google+genai', '@mistralai+', '@shikijs',
  '@babel', '@typescript-eslint', '@eslint', 'eslint@', 'prettier@', '@prettier'
)

# 长路径安全删除：robocopy 镜像空目录
function Remove-TreeSafe($dir) {
  $empty = Join-Path (Split-Path $dir) '_prune_empty'
  New-Item -ItemType Directory -Force $empty | Out-Null
  robocopy $empty $dir /MIR /R:1 /W:1 /NFL /NDL /NJH /NJS | Out-Null
  Remove-Item $empty -Force -ErrorAction SilentlyContinue
  Remove-Item $dir -Force -ErrorAction SilentlyContinue
}

$removed = 0; $freed = 0
foreach ($prefix in $prefixes) {
  Get-ChildItem $pnpm -Directory -Filter ($prefix + '*') -ErrorAction SilentlyContinue | ForEach-Object {
    $size = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    $freed += $size
    Remove-TreeSafe $_.FullName
    $removed++
    Write-Host ("  deleted: " + $_.Name.Substring(0, [Math]::Min(70, $_.Name.Length)))
  }
}

# 顶层悬空链接清理（.pnpm 目录已删，链接无害但保持干净）
$nmRoot = Join-Path $PkgRoot 'engine\node_modules'
foreach ($prefix in $prefixes) {
  Get-ChildItem $nmRoot -Force -ErrorAction SilentlyContinue | Where-Object { $_.LinkType -and $_.Name.StartsWith($prefix) } | ForEach-Object {
    Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
  }
}

Write-Host ("==> 删除目录数: " + $removed + "，释放空间: " + [math]::Round($freed / 1MB, 1) + " MB")
